import { CalendarEvent } from "./calendarClient";
import { v5 as uuidv5 } from "uuid";
import short from "short-uuid";
import { stripHtml } from "./emails/helpers";

const translator = short();

export default class CalEventParser {
  calEvent: CalendarEvent;

  constructor(calEvent: CalendarEvent) {
    this.calEvent = calEvent;
  }

  /**
   * Returns a link to reschedule the given booking.
   */
  public getRescheduleLink(): string {
    return process.env.BASE_URL + "/reschedule/" + this.getUid();
  }

  /**
   * Returns a link to cancel the given booking.
   */
  public getCancelLink(): string {
    return process.env.BASE_URL + "/cancel/" + this.getUid();
  }

  /**
   * Returns a unique identifier for the given calendar event.
   */
  public getUid(): string {
    return translator.fromUUID(uuidv5(JSON.stringify(this.calEvent), uuidv5.URL));
  }

  /**
   * Returns a footer section with links to change the event (as HTML).
   */
  public getChangeEventFooterHtml(): string {
    return `
      <br/>
      <br/>
      <strong>Need to change this event?</strong><br />
      Cancel: <a href="${this.getCancelLink()}">${this.getCancelLink()}</a><br />
      Reschedule: <a href="${this.getRescheduleLink()}">${this.getRescheduleLink()}</a>
    `;
  }

  /**
   * Returns a footer section with links to change the event (as plain text).
   */
  public getChangeEventFooter(): string {
    return stripHtml(this.getChangeEventFooterHtml());
  }

  /**
   * Returns an extended description with all important information (as HTML).
   *
   * @protected
   */
  public getRichDescriptionHtml(): string {
    return (
      `
        <strong>Event Type:</strong><br />
        ${this.calEvent.type}<br />
        <br />
        <strong>Invitee Email:</strong><br />
        <a href="mailto:${this.calEvent.attendees[0].email}">${this.calEvent.attendees[0].email}</a><br />
        <br />` +
      (this.calEvent.location
        ? `
            <strong>Location:</strong><br />
            ${this.calEvent.location}<br />
            <br />
          `
        : "") +
      `<strong>Invitee Time Zone:</strong><br />
        ${this.calEvent.attendees[0].timeZone}<br />
        <br />
        <strong>Additional notes:</strong><br />
        ${this.calEvent.description}
      ` +
      this.getChangeEventFooterHtml()
    );
  }

  /**
   * Returns an extended description with all important information (as plain text).
   *
   * @protected
   */
  public getRichDescription(): string {
    return stripHtml(this.getRichDescriptionHtml());
  }

  /**
   * Returns a calendar event with rich description.
   */
  public asRichEvent(): CalendarEvent {
    const eventCopy: CalendarEvent = { ...this.calEvent };
    eventCopy.description = this.getRichDescriptionHtml();
    return eventCopy;
  }
}
