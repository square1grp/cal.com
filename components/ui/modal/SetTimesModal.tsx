import { ClockIcon } from "@heroicons/react/outline";
import { useRef } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/utc";
dayjs.extend(utc);
dayjs.extend(timezone);

export default function SetTimesModal(props) {
  const { startDate, endDate } = {
    startDate: dayjs
      .utc()
      .startOf("day")
      .add(props.schedule.startTime || 540, "minutes"),
    endDate: dayjs
      .utc()
      .startOf("day")
      .add(props.schedule.endTime || 1020, "minutes"),
  };

  startDate.tz(props.timeZone);
  endDate.tz(props.timeZone);

  const startHoursRef = useRef<HTMLInputElement>();
  const startMinsRef = useRef<HTMLInputElement>();
  const endHoursRef = useRef<HTMLInputElement>();
  const endMinsRef = useRef<HTMLInputElement>();

  function updateStartEndTimesHandler(event) {
    event.preventDefault();

    const enteredStartHours = parseInt(startHoursRef.current.value);
    const enteredStartMins = parseInt(startMinsRef.current.value);
    const enteredEndHours = parseInt(endHoursRef.current.value);
    const enteredEndMins = parseInt(endMinsRef.current.value);

    props.onChange({
      startDate: startDate.minute(enteredStartMins).hour(enteredStartHours),
      endDate: endDate.minute(enteredEndMins).hour(enteredEndHours),
    });

    props.onExit(0);
  }

  return (
    <div
      className="fixed z-10 inset-0 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start mb-4">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <ClockIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Change when you are available for bookings
              </h3>
              <div>
                <p className="text-sm text-gray-500">Set your work schedule</p>
              </div>
            </div>
          </div>
          <div className="flex mb-4">
            <label className="w-1/4 pt-2 block text-sm font-medium text-gray-700">Start time</label>
            <div>
              <label htmlFor="startHours" className="sr-only">
                Hours
              </label>
              <input
                ref={startHoursRef}
                type="number"
                min="0"
                max="23"
                maxLength="2"
                name="hours"
                id="startHours"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="9"
                defaultValue={startDate.format("H")}
              />
            </div>
            <span className="mx-2 pt-1">:</span>
            <div>
              <label htmlFor="startMinutes" className="sr-only">
                Minutes
              </label>
              <input
                ref={startMinsRef}
                type="number"
                min="0"
                max="59"
                step="15"
                maxLength="2"
                name="minutes"
                id="startMinutes"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="30"
                defaultValue={startDate.format("m")}
              />
            </div>
          </div>
          <div className="flex">
            <label className="w-1/4 pt-2 block text-sm font-medium text-gray-700">End time</label>
            <div>
              <label htmlFor="endHours" className="sr-only">
                Hours
              </label>
              <input
                ref={endHoursRef}
                type="number"
                min="0"
                max="24"
                maxLength="2"
                name="hours"
                id="endHours"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="17"
                defaultValue={endDate.format("H")}
              />
            </div>
            <span className="mx-2 pt-1">:</span>
            <div>
              <label htmlFor="endMinutes" className="sr-only">
                Minutes
              </label>
              <input
                ref={endMinsRef}
                type="number"
                min="0"
                max="59"
                maxLength="2"
                step="15"
                name="minutes"
                id="endMinutes"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="30"
                defaultValue={endDate.format("m")}
              />
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button onClick={updateStartEndTimesHandler} type="submit" className="btn btn-primary">
              Save
            </button>
            <button onClick={props.onExit} type="button" className="btn btn-white mr-2">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
