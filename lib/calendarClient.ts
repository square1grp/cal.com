import EventOrganizerMail from "./emails/EventOrganizerMail";
import EventAttendeeMail from "./emails/EventAttendeeMail";
import { v5 as uuidv5 } from "uuid";
import short from "short-uuid";
import EventOrganizerRescheduledMail from "./emails/EventOrganizerRescheduledMail";
import EventAttendeeRescheduledMail from "./emails/EventAttendeeRescheduledMail";

const translator = short();

const { google } = require("googleapis");

const googleAuth = () => {
  const { client_secret, client_id, redirect_uris } = JSON.parse(
    process.env.GOOGLE_API_CREDENTIALS
  ).web;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
};

function handleErrorsJson(response) {
  if (!response.ok) {
    response.json().then(console.log);
    throw Error(response.statusText);
  }
  return response.json();
}

function handleErrorsRaw(response) {
  if (!response.ok) {
    response.text().then(console.log);
    throw Error(response.statusText);
  }
  return response.text();
}

const o365Auth = (credential) => {
  const isExpired = (expiryDate) => expiryDate < +new Date();

  const refreshAccessToken = (refreshToken) =>
    fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        scope: "User.Read Calendars.Read Calendars.ReadWrite",
        client_id: process.env.MS_GRAPH_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        client_secret: process.env.MS_GRAPH_CLIENT_SECRET,
      }),
    })
      .then(handleErrorsJson)
      .then((responseBody) => {
        credential.key.access_token = responseBody.access_token;
        credential.key.expiry_date = Math.round(
          +new Date() / 1000 + responseBody.expires_in
        );
        return credential.key.access_token;
      });

  return {
    getToken: () =>
      !isExpired(credential.key.expiry_date)
        ? Promise.resolve(credential.key.access_token)
        : refreshAccessToken(credential.key.refresh_token),
  };
};

interface Person {
  name?: string;
  email: string;
  timeZone: string;
}

interface CalendarEvent {
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  organizer: Person;
  attendees: Person[];
  conferenceData?: ConferenceData;
}

interface ConferenceData {
  createRequest: any;
}

interface IntegrationCalendar {
  integration: string;
  primary: boolean;
  externalId: string;
  name: string;
}

interface CalendarApiAdapter {
  createEvent(event: CalendarEvent): Promise<any>;

  updateEvent(uid: String, event: CalendarEvent);

  deleteEvent(uid: String);

  getAvailability(
    dateFrom,
    dateTo,
    selectedCalendars: IntegrationCalendar[]
  ): Promise<any>;

  listCalendars(): Promise<IntegrationCalendar[]>;
}

const MicrosoftOffice365Calendar = (credential): CalendarApiAdapter => {
  const auth = o365Auth(credential);

  const translateEvent = (event: CalendarEvent) => {
    let optional = {};
    if (event.location) {
      optional.location = { displayName: event.location };
    }

    return {
      subject: event.title,
      body: {
        contentType: "HTML",
        content: event.description,
      },
      start: {
        dateTime: event.startTime,
        timeZone: event.organizer.timeZone,
      },
      end: {
        dateTime: event.endTime,
        timeZone: event.organizer.timeZone,
      },
      attendees: event.attendees.map((attendee) => ({
        emailAddress: {
          address: attendee.email,
          name: attendee.name,
        },
        type: "required",
      })),
      ...optional,
    };
  };

  const integrationType = "office365_calendar";

  function listCalendars(): Promise<IntegrationCalendar[]> {
    return auth.getToken().then((accessToken) =>
      fetch("https://graph.microsoft.com/v1.0/me/calendars", {
        method: "get",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
      })
        .then(handleErrorsJson)
        .then((responseBody) => {
          return responseBody.value.map((cal) => {
            const calendar: IntegrationCalendar = {
              externalId: cal.id,
              integration: integrationType,
              name: cal.name,
              primary: cal.isDefaultCalendar,
            };
            return calendar;
          });
        })
    );
  }

  return {
    getAvailability: (dateFrom, dateTo, selectedCalendars) => {
      const filter =
        "?$filter=start/dateTime ge '" +
        dateFrom +
        "' and end/dateTime le '" +
        dateTo +
        "'";
      return auth
        .getToken()
        .then((accessToken) => {
          const selectedCalendarIds = selectedCalendars
            .filter((e) => e.integration === integrationType)
            .map((e) => e.externalId);
          if (selectedCalendarIds.length == 0 && selectedCalendars.length > 0) {
            // Only calendars of other integrations selected
            return Promise.resolve([]);
          }

          return (
            selectedCalendarIds.length == 0
              ? listCalendars().then((cals) => cals.map((e) => e.externalId))
              : Promise.resolve(selectedCalendarIds).then((x) => x)
          ).then((ids: string[]) => {
            const urls = ids.map(
              (calendarId) =>
                "https://graph.microsoft.com/v1.0/me/calendars/" +
                calendarId +
                "/events" +
                filter
            );
            return Promise.all(
              urls.map((url) =>
                fetch(url, {
                  method: "get",
                  headers: {
                    Authorization: "Bearer " + accessToken,
                    Prefer: 'outlook.timezone="Etc/GMT"',
                  },
                })
                  .then(handleErrorsJson)
                  .then((responseBody) =>
                    responseBody.value.map((evt) => ({
                      start: evt.start.dateTime + "Z",
                      end: evt.end.dateTime + "Z",
                    }))
                  )
              )
            ).then((results) =>
              results.reduce((acc, events) => acc.concat(events), [])
            );
          });
        })
        .catch((err) => {
          console.log(err);
        });
    },
    createEvent: (event: CalendarEvent) =>
      auth.getToken().then((accessToken) =>
        fetch("https://graph.microsoft.com/v1.0/me/calendar/events", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(translateEvent(event)),
        })
          .then(handleErrorsJson)
          .then((responseBody) => ({
            ...responseBody,
            disableConfirmationEmail: true,
          }))
      ),
    deleteEvent: (uid: String) =>
      auth.getToken().then((accessToken) =>
        fetch("https://graph.microsoft.com/v1.0/me/calendar/events/" + uid, {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        }).then(handleErrorsRaw)
      ),
    updateEvent: (uid: String, event: CalendarEvent) =>
      auth.getToken().then((accessToken) =>
        fetch("https://graph.microsoft.com/v1.0/me/calendar/events/" + uid, {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(translateEvent(event)),
        }).then(handleErrorsRaw)
      ),
    listCalendars,
  };
};

const GoogleCalendar = (credential): CalendarApiAdapter => {
  const myGoogleAuth = googleAuth();
  myGoogleAuth.setCredentials(credential.key);
  const integrationType = "google_calendar";

  return {
    getAvailability: (dateFrom, dateTo, selectedCalendars) =>
      new Promise((resolve, reject) => {
        const calendar = google.calendar({ version: "v3", auth: myGoogleAuth });
        calendar.calendarList
          .list()
          .then((cals) => {
            const filteredItems = cals.data.items.filter(
              (i) =>
                selectedCalendars.findIndex((e) => e.externalId === i.id) > -1
            );
            if (filteredItems.length == 0 && selectedCalendars.length > 0) {
              // Only calendars of other integrations selected
              resolve([]);
            }
            calendar.freebusy.query(
              {
                requestBody: {
                  timeMin: dateFrom,
                  timeMax: dateTo,
                  items:
                    filteredItems.length > 0 ? filteredItems : cals.data.items,
                },
              },
              (err, apires) => {
                if (err) {
                  reject(err);
                }

                resolve(
                  Object.values(apires.data.calendars).flatMap(
                    (item) => item["busy"]
                  )
                );
              }
            );
          })
          .catch((err) => {
            reject(err);
          });
      }),
    createEvent: (event: CalendarEvent) =>
      new Promise((resolve, reject) => {
        const payload = {
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.startTime,
            timeZone: event.organizer.timeZone,
          },
          end: {
            dateTime: event.endTime,
            timeZone: event.organizer.timeZone,
          },
          attendees: event.attendees,
          reminders: {
            useDefault: false,
            overrides: [{ method: "email", minutes: 60 }],
          },
        };

        if (event.location) {
          payload["location"] = event.location;
        }

        if (event.conferenceData) {
          payload["conferenceData"] = event.conferenceData;
        }

        const calendar = google.calendar({ version: "v3", auth: myGoogleAuth });
        calendar.events.insert(
          {
            auth: myGoogleAuth,
            calendarId: "primary",
            resource: payload,
            conferenceDataVersion: 1,
          },
          function (err, event) {
            if (err) {
              console.log(
                "There was an error contacting the Calendar service: " + err
              );
              return reject(err);
            }
            return resolve(event.data);
          }
        );
      }),
    updateEvent: (uid: String, event: CalendarEvent) =>
      new Promise((resolve, reject) => {
        const payload = {
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.startTime,
            timeZone: event.organizer.timeZone,
          },
          end: {
            dateTime: event.endTime,
            timeZone: event.organizer.timeZone,
          },
          attendees: event.attendees,
          reminders: {
            useDefault: false,
            overrides: [{ method: "email", minutes: 60 }],
          },
        };

        if (event.location) {
          payload["location"] = event.location;
        }

        const calendar = google.calendar({ version: "v3", auth: myGoogleAuth });
        calendar.events.update(
          {
            auth: myGoogleAuth,
            calendarId: "primary",
            eventId: uid,
            sendNotifications: true,
            sendUpdates: "all",
            resource: payload,
          },
          function (err, event) {
            if (err) {
              console.log(
                "There was an error contacting the Calendar service: " + err
              );
              return reject(err);
            }
            return resolve(event.data);
          }
        );
      }),
    deleteEvent: (uid: String) =>
      new Promise((resolve, reject) => {
        const calendar = google.calendar({ version: "v3", auth: myGoogleAuth });
        calendar.events.delete(
          {
            auth: myGoogleAuth,
            calendarId: "primary",
            eventId: uid,
            sendNotifications: true,
            sendUpdates: "all",
          },
          function (err, event) {
            if (err) {
              console.log(
                "There was an error contacting the Calendar service: " + err
              );
              return reject(err);
            }
            return resolve(event.data);
          }
        );
      }),
    listCalendars: () =>
      new Promise((resolve, reject) => {
        const calendar = google.calendar({ version: "v3", auth: myGoogleAuth });
        calendar.calendarList
          .list()
          .then((cals) => {
            resolve(
              cals.data.items.map((cal) => {
                const calendar: IntegrationCalendar = {
                  externalId: cal.id,
                  integration: integrationType,
                  name: cal.summary,
                  primary: cal.primary,
                };
                return calendar;
              })
            );
          })
          .catch((err) => {
            reject(err);
          });
      }),
  };
};

// factory
const calendars = (withCredentials): CalendarApiAdapter[] =>
  withCredentials
    .map((cred) => {
      switch (cred.type) {
        case "google_calendar":
          return GoogleCalendar(cred);
        case "office365_calendar":
          return MicrosoftOffice365Calendar(cred);
        default:
          return; // unknown credential, could be legacy? In any case, ignore
      }
    })
    .filter(Boolean);

const getBusyCalendarTimes = (
  withCredentials,
  dateFrom,
  dateTo,
  selectedCalendars
) =>
  Promise.all(
    calendars(withCredentials).map((c) =>
      c.getAvailability(dateFrom, dateTo, selectedCalendars)
    )
  ).then((results) => {
    return results.reduce((acc, availability) => acc.concat(availability), []);
  });

const listCalendars = (withCredentials) =>
  Promise.all(calendars(withCredentials).map((c) => c.listCalendars())).then(
    (results) => results.reduce((acc, calendars) => acc.concat(calendars), [])
  );

const createEvent = async (
  credential,
  calEvent: CalendarEvent
): Promise<any> => {
  const uid: string = translator.fromUUID(
    uuidv5(JSON.stringify(calEvent), uuidv5.URL)
  );

  const creationResult = credential
    ? await calendars([credential])[0].createEvent(calEvent)
    : null;

  const organizerMail = new EventOrganizerMail(calEvent, uid);
  const attendeeMail = new EventAttendeeMail(calEvent, uid);
  await organizerMail.sendEmail();

  if (!creationResult || !creationResult.disableConfirmationEmail) {
    await attendeeMail.sendEmail();
  }

  return {
    uid,
    createdEvent: creationResult,
  };
};

const updateEvent = async (
  credential,
  uidToUpdate: String,
  calEvent: CalendarEvent
): Promise<any> => {
  const newUid: string = translator.fromUUID(
    uuidv5(JSON.stringify(calEvent), uuidv5.URL)
  );

  const updateResult = credential
    ? await calendars([credential])[0].updateEvent(uidToUpdate, calEvent)
    : null;

  const organizerMail = new EventOrganizerRescheduledMail(calEvent, newUid);
  const attendeeMail = new EventAttendeeRescheduledMail(calEvent, newUid);
  await organizerMail.sendEmail();

  if (!updateResult || !updateResult.disableConfirmationEmail) {
    await attendeeMail.sendEmail();
  }

  return {
    uid: newUid,
    updatedEvent: updateResult,
  };
};

const deleteEvent = (credential, uid: String): Promise<any> => {
  if (credential) {
    return calendars([credential])[0].deleteEvent(uid);
  }

  return Promise.resolve({});
};

export {
  getBusyCalendarTimes,
  createEvent,
  updateEvent,
  deleteEvent,
  CalendarEvent,
  listCalendars,
  IntegrationCalendar,
};
