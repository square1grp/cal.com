import Head from "next/head";
import Link from "next/link";
import prisma from "../../lib/prisma";
import Shell from "../../components/Shell";
import { useEffect, useState } from "react";
import { getSession, useSession } from "next-auth/client";
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PlusIcon,
  XCircleIcon,
} from "@heroicons/react/solid";
import { InformationCircleIcon } from "@heroicons/react/outline";
import { Switch } from "@headlessui/react";
import Loader from '@components/Loader';
import classNames from "@lib/classNames";

export default function IntegrationHome({ integrations }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSelectCalendarModal, setShowSelectCalendarModal] = useState(false);
  const [selectableCalendars, setSelectableCalendars] = useState([]);

  function toggleAddModal() {
    setShowAddModal(!showAddModal);
  }

  function toggleShowCalendarModal() {
    setShowSelectCalendarModal(!showSelectCalendarModal);
  }

  function loadCalendars() {
    fetch("api/availability/calendar")
      .then((response) => response.json())
      .then((data) => {
        setSelectableCalendars(data);
      });
  }

  function integrationHandler(type) {
    fetch("/api/integrations/" + type.replace("_", "") + "/add")
      .then((response) => response.json())
      .then((data) => (window.location.href = data.url));
  }

  function calendarSelectionHandler(calendar) {
    return (selected) => {
      const cals = [...selectableCalendars];
      const i = cals.findIndex((c) => c.externalId === calendar.externalId);
      cals[i].selected = selected;
      setSelectableCalendars(cals);
      if (selected) {
        fetch("api/availability/calendar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cals[i]),
        }).then((response) => response.json());
      } else {
        fetch("api/availability/calendar", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cals[i]),
        }).then((response) => response.json());
      }
    };
  }

  function getCalendarIntegrationImage(integrationType: string) {
    switch (integrationType) {
      case "google_calendar":
        return "integrations/google-calendar.svg";
      case "office365_calendar":
        return "integrations/outlook.svg";
      default:
        return "";
    }
  }

  useEffect(loadCalendars, [integrations]);

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <Head>
        <title>App Store | Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Shell
        heading="App Store"
        subtitle="Connect your favourite apps."
        CTA={
          <button
            onClick={toggleAddModal}
            type="button"
            className="flex justify-center py-2 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900">
            <PlusIcon className="w-5 h-5 mr-1" />
            Connect a new App
          </button>
        }>
        <div className="bg-white border border-gray-200 overflow-hidden rounded-sm mb-8">
          {integrations.filter((ig) => ig.credential).length !== 0 ? (
            <ul className="divide-y divide-gray-200">
              {integrations
                .filter((ig) => ig.credential)
                .map((ig) => (
                  <li key={ig.id}>
                    <Link href={"/integrations/" + ig.credential.id}>
                      <a className="block hover:bg-gray-50">
                        <div className="flex items-center px-4 py-4 sm:px-6">
                          <div className="min-w-0 flex-1 flex items-center">
                            <div className="flex-shrink-0">
                              <img className="h-10 w-10 mr-2" src={ig.imageSrc} alt={ig.title} />
                            </div>
                            <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                              <div>
                                <p className="text-sm font-medium text-neutral-900 truncate">{ig.title}</p>
                                <p className="flex items-center text-sm text-gray-500">
                                  {ig.type.endsWith("_calendar") && (
                                    <span className="truncate">Calendar Integration</span>
                                  )}
                                  {ig.type.endsWith("_video") && (
                                    <span className="truncate">Video Conferencing</span>
                                  )}
                                </p>
                              </div>
                              <div className="hidden md:block">
                                {ig.credential.key && (
                                  <p className="mt-2 flex items-center text text-gray-500">
                                    <CheckCircleIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-green-400" />
                                    Connected
                                  </p>
                                )}
                                {!ig.credential.key && (
                                  <p className="mt-3 flex items-center text text-gray-500">
                                    <XCircleIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-yellow-400" />
                                    Not connected
                                  </p>
                                )}
                              </div>
                            </div>
                            <div>
                              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      </a>
                    </Link>
                  </li>
                ))}
            </ul>
          ) : (
            <div className="bg-white shadow rounded-sm">
              <div className="flex">
                <div className="py-9 pl-8">
                  <InformationCircleIcon className="text-neutral-900 w-16" />
                </div>
                <div className="py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    You don&apos;t have any apps connected.
                  </h3>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>
                      You currently do not have any apps connected. Connect your first app to get started.
                    </p>
                  </div>
                  <div className="mt-3 text-sm">
                    <button
                      onClick={toggleAddModal}
                      className="font-medium text-neutral-900 hover:text-neutral-500">
                      {" "}
                      Connect your first app <span aria-hidden="true">&rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {showAddModal && (
          <div
            className="fixed z-50 inset-0 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* <!--
                          Background overlay, show/hide based on modal state.

                          Entering: "ease-out duration-300"
                            From: "opacity-0"
                            To: "opacity-100"
                          Leaving: "ease-in duration-200"
                            From: "opacity-100"
                            To: "opacity-0"
                        --> */}
              <div
                className="fixed inset-0 bg-gray-500 z-0 bg-opacity-75 transition-opacity"
                aria-hidden="true"></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>
              {/* <!--
                          Modal panel, show/hide based on modal state.

                          Entering: "ease-out duration-300"
                            From: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            To: "opacity-100 translate-y-0 sm:scale-100"
                          Leaving: "ease-in duration-200"
                            From: "opacity-100 translate-y-0 sm:scale-100"
                            To: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        --> */}
              <div className="inline-block align-bottom bg-white rounded-sm px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-neutral-100 sm:mx-0 sm:h-10 sm:w-10">
                    <PlusIcon className="h-6 w-6 text-neutral-900" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Connect a new App
                    </h3>
                    <div>
                      <p className="text-sm text-gray-400">Connect a new app to your account.</p>
                    </div>
                  </div>
                </div>
                <div className="my-4">
                  <ul className="divide-y divide-gray-200">
                    {integrations
                      .filter((integration) => integration.installed)
                      .map((integration) => (
                        <li key={integration.type} className="flex py-4">
                          <div className="w-1/12 mr-4 pt-2">
                            <img
                              className="h-8 w-8 mr-2"
                              src={integration.imageSrc}
                              alt={integration.title}
                            />
                          </div>
                          <div className="w-10/12">
                            <h2 className="text-gray-800 font-medium">{integration.title}</h2>
                            <p className="text-gray-400 text-sm">{integration.description}</p>
                          </div>
                          <div className="w-2/12 text-right pt-2">
                            <button
                              onClick={() => integrationHandler(integration.type)}
                              className="font-medium text-neutral-900 hover:text-neutral-500">
                              Add
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={toggleAddModal}
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-sm border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 sm:mt-0 sm:w-auto sm:text-sm">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-sm mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Select calendars</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Select which calendars are checked for availability to prevent double bookings.</p>
            </div>
            <div className="mt-5">
              <button type="button" onClick={toggleShowCalendarModal} className="btn btn-primary">
                Select calendars
              </button>
            </div>
          </div>
        </div>
        {showSelectCalendarModal && (
          <div
            className="fixed z-50 inset-0 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* <!--
                          Background overlay, show/hide based on modal state.

                          Entering: "ease-out duration-300"
                            From: "opacity-0"
                            To: "opacity-100"
                          Leaving: "ease-in duration-200"
                            From: "opacity-100"
                            To: "opacity-0"
                        --> */}
              <div
                className="fixed inset-0 bg-gray-500 z-0 bg-opacity-75 transition-opacity"
                aria-hidden="true"></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>
              {/* <!--
                          Modal panel, show/hide based on modal state.

                          Entering: "ease-out duration-300"
                            From: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            To: "opacity-100 translate-y-0 sm:scale-100"
                          Leaving: "ease-in duration-200"
                            From: "opacity-100 translate-y-0 sm:scale-100"
                            To: "opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        --> */}
              <div className="inline-block align-bottom bg-white rounded-sm px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-neutral-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CalendarIcon className="h-6 w-6 text-neutral-900" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Select calendars
                    </h3>
                    <div>
                      <p className="text-sm text-gray-400">
                        If no entry is selected, all calendars will be checked
                      </p>
                    </div>
                  </div>
                </div>
                <div className="my-4">
                  <ul className="divide-y divide-gray-200">
                    {selectableCalendars.map((calendar) => (
                      <li key={calendar.name} className="flex py-4">
                        <div className="w-1/12 mr-4 pt-2">
                          <img
                            className="h-8 w-8 mr-2"
                            src={getCalendarIntegrationImage(calendar.integration)}
                            alt={calendar.integration}
                          />
                        </div>
                        <div className="w-10/12 pt-3">
                          <h2 className="text-gray-800 font-medium">{calendar.name}</h2>
                        </div>
                        <div className="w-2/12 text-right pt-3">
                          <Switch
                            checked={calendar.selected}
                            onChange={calendarSelectionHandler(calendar)}
                            className={classNames(
                              calendar.selected ? "bg-neutral-900" : "bg-gray-200",
                              "relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500"
                            )}>
                            <span className="sr-only">Select calendar</span>
                            <span
                              aria-hidden="true"
                              className={classNames(
                                calendar.selected ? "translate-x-5" : "translate-x-0",
                                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
                              )}
                            />
                          </Switch>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={toggleShowCalendarModal}
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-sm border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 sm:mt-0 sm:w-auto sm:text-sm">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border border-gray-200 rounded-sm">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Launch your own App</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>If you want to add your own App here, get in touch with us.</p>
            </div>
            <div className="mt-5">
              <a href="apps@calendso.com" className="btn btn-white">
                Contact us
              </a>
            </div>
          </div>
        </div>
      </Shell>
    </div>
  );
}

const validJson = (jsonString: string) => {
  try {
    const o = JSON.parse(jsonString);
    if (o && typeof o === "object") {
      return o;
    }
  } catch (e) {
    console.error(e);
  }
  return false;
};

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }
  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
    },
  });

  const credentials = await prisma.credential.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      type: true,
      key: true,
    },
  });

  const integrations = [
    {
      installed: !!(process.env.GOOGLE_API_CREDENTIALS && validJson(process.env.GOOGLE_API_CREDENTIALS)),
      credential: credentials.find((integration) => integration.type === "google_calendar") || null,
      type: "google_calendar",
      title: "Google Calendar",
      imageSrc: "integrations/google-calendar.svg",
      description: "For personal and business calendars",
    },
    {
      installed: !!(process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET),
      type: "office365_calendar",
      credential: credentials.find((integration) => integration.type === "office365_calendar") || null,
      title: "Office 365 / Outlook.com Calendar",
      imageSrc: "integrations/outlook.svg",
      description: "For personal and business calendars",
    },
    {
      installed: !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),
      type: "zoom_video",
      credential: credentials.find((integration) => integration.type === "zoom_video") || null,
      title: "Zoom",
      imageSrc: "integrations/zoom.svg",
      description: "Video Conferencing",
    },
  ];

  return {
    props: { integrations },
  };
}
