import type {NextApiRequest, NextApiResponse} from 'next';
import prisma from '../../../lib/prisma';
import {CalendarEvent, createEvent, updateEvent} from '../../../lib/calendarClient';
import async from 'async';
import {v5 as uuidv5} from 'uuid';
import short from 'short-uuid';
import {createMeeting, updateMeeting} from "../../../lib/videoClient";
import EventAttendeeMail from "../../../lib/emails/EventAttendeeMail";
import {getEventName} from "../../../lib/event";
import { LocationType } from '../../../lib/location';
import merge from "lodash.merge"
const translator = short();

interface p {
  location: string
}

const getLocationRequestFromIntegration = ({location}: p) => {
  if (location === LocationType.GoogleMeet.valueOf()) {
    const requestId = uuidv5(location, uuidv5.URL)

    return {
      conferenceData: {
        createRequest: {
          requestId: requestId
        }
      }
    }
  }

  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {user} = req.query;

  const currentUser = await prisma.user.findFirst({
    where: {
      username: user,
    },
    select: {
      id: true,
      credentials: true,
      timeZone: true,
      email: true,
      name: true,
    }
  });

  // Split credentials up into calendar credentials and video credentials
  const calendarCredentials = currentUser.credentials.filter(cred => cred.type.endsWith('_calendar'));
  const videoCredentials = currentUser.credentials.filter(cred => cred.type.endsWith('_video'));

  const rescheduleUid = req.body.rescheduleUid;

  const selectedEventType = await prisma.eventType.findFirst({
    where: {
      userId: currentUser.id,
      id: req.body.eventTypeId
    },
    select: {
      eventName: true,
      title: true
    }
  });

  let rawLocation = req.body.location

  let evt: CalendarEvent = {
    type: selectedEventType.title,
    title: getEventName(req.body.name, selectedEventType.title, selectedEventType.eventName),
    description: req.body.notes,
    startTime: req.body.start,
    endTime: req.body.end,
    organizer: {email: currentUser.email, name: currentUser.name, timeZone: currentUser.timeZone},
    attendees: [
      {email: req.body.email, name: req.body.name, timeZone: req.body.timeZone}
    ]
  };

  // If phone or inPerson use raw location
  // set evt.location to req.body.location
  if (!rawLocation.includes('integration')) {
    evt.location = rawLocation
  }
  

  // If location is set to an integration location
  // Build proper transforms for evt object
  // Extend evt object with those transformations
  if (rawLocation.includes('integration')) {
    let maybeLocationRequestObject = getLocationRequestFromIntegration({
      location: rawLocation
    }) 
    
    evt = merge(evt, maybeLocationRequestObject)
  }
  
  const eventType = await prisma.eventType.findFirst({
    where: {
      userId: currentUser.id,
      title: evt.type
    },
    select: {
      id: true
    }
  });

  let results = [];
  let referencesToCreate = [];

  if (rescheduleUid) {
    // Reschedule event
    const booking = await prisma.booking.findFirst({
      where: {
        uid: rescheduleUid
      },
      select: {
        id: true,
        references: {
          select: {
            id: true,
            type: true,
            uid: true
          }
        }
      }
    });

    // Use all integrations
    results = results.concat(await async.mapLimit(calendarCredentials, 5, async (credential) => {
      const bookingRefUid = booking.references.filter((ref) => ref.type === credential.type)[0].uid;
      const response = await updateEvent(credential, bookingRefUid, evt);

      return {
        type: credential.type,
        response
      };
    }));

    results = results.concat(await async.mapLimit(videoCredentials, 5, async (credential) => {
      const bookingRefUid = booking.references.filter((ref) => ref.type === credential.type)[0].uid;
      const response = await updateMeeting(credential, bookingRefUid, evt);
      return {
        type: credential.type,
        response
      };
    }));

    // Clone elements
    referencesToCreate = [...booking.references];

    // Now we can delete the old booking and its references.
    let bookingReferenceDeletes = prisma.bookingReference.deleteMany({
      where: {
        bookingId: booking.id
      }
    });
    let attendeeDeletes = prisma.attendee.deleteMany({
      where: {
        bookingId: booking.id
      }
    });
    let bookingDeletes = prisma.booking.delete({
      where: {
        uid: rescheduleUid
      }
    });

    await Promise.all([
      bookingReferenceDeletes,
      attendeeDeletes,
      bookingDeletes
    ]);
  } else {
    // Schedule event
    results = results.concat(await async.mapLimit(calendarCredentials, 5, async (credential) => {
      const response = await createEvent(credential, evt);
      return {
        type: credential.type,
        response
      };
    }));

    results = results.concat(await async.mapLimit(videoCredentials, 5, async (credential) => {
      const response = await createMeeting(credential, evt);
      return {
        type: credential.type,
        response
      };
    }));

    referencesToCreate = results.map((result => {
      return {
        type: result.type,
        uid: result.response.createdEvent.id.toString()
      };
    }));
  }

  // TODO Should just be set to the true case as soon as we have a "bare email" integration class.
  // UID generation should happen in the integration itself, not here.
  const hashUID = results.length > 0 ? results[0].response.uid : translator.fromUUID(uuidv5(JSON.stringify(evt), uuidv5.URL));
  if(results.length === 0) {
    // Legacy as well, as soon as we have a separate email integration class. Just used
    // to send an email even if there is no integration at all.
    const mail = new EventAttendeeMail(evt, hashUID);
    await mail.sendEmail();
  }

  await prisma.booking.create({
    data: {
      uid: hashUID,
      userId: currentUser.id,
      references: {
        create: referencesToCreate
      },
      eventTypeId: eventType.id,

      title: evt.title,
      description: evt.description,
      startTime: evt.startTime,
      endTime: evt.endTime,

      attendees: {
        create: evt.attendees
      }
    }
  });

  res.status(200).json(results);
}
