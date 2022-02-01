import { ArrowRightIcon } from "@heroicons/react/outline";
import { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { Toaster } from "react-hot-toast";
import { JSONObject } from "superjson/dist/types";

import { useLocale } from "@lib/hooks/useLocale";
import useTheme from "@lib/hooks/useTheme";
import showToast from "@lib/notification";
import prisma from "@lib/prisma";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import EventTypeDescription from "@components/eventtype/EventTypeDescription";
import { HeadSeo } from "@components/seo/head-seo";
import Avatar from "@components/ui/Avatar";

import { ssrInit } from "@server/lib/ssr";

import CryptoSection from "../ee/components/web3/CryptoSection";

interface EvtsToVerify {
  [evtId: string]: boolean;
}

export default function User(props: inferSSRProps<typeof getServerSideProps>) {
  const { isReady } = useTheme(props.user.theme);
  const { user, eventTypes } = props;
  const { t } = useLocale();
  const router = useRouter();
  const query = { ...router.query };
  delete query.user; // So it doesn't display in the Link (and make tests fail)

  const nameOrUsername = user.name || user.username || "";

  const [evtsToVerify, setEvtsToVerify] = useState<EvtsToVerify>({});

  return (
    <>
      <HeadSeo
        title={nameOrUsername}
        description={(user.bio as string) || ""}
        name={nameOrUsername}
        username={(user.username as string) || ""}
        // avatar={user.avatar || undefined}
      />
      {isReady && (
        <div className="h-screen dark:bg-black">
          <main className="max-w-3xl px-4 py-24 mx-auto">
            <div className="mb-8 text-center">
              <Avatar
                imageSrc={user.avatar}
                className="w-24 h-24 mx-auto mb-4 rounded-full"
                alt={nameOrUsername}
              />
              <h1 className="mb-1 text-3xl font-bold font-cal text-neutral-900 dark:text-white">
                {nameOrUsername}
              </h1>
              <p className="text-neutral-500 dark:text-white">{user.bio}</p>
            </div>
            <div className="space-y-6" data-testid="event-types">
              {!user.away &&
                eventTypes.map((type) => (
                  <div
                    key={type.id}
                    style={{ display: "flex" }}
                    className="relative bg-white border rounded-sm group dark:bg-neutral-900 dark:border-0 dark:hover:border-neutral-600 hover:bg-gray-50 border-neutral-200 hover:border-brand">
                    <ArrowRightIcon className="absolute w-4 h-4 text-black transition-opacity opacity-0 right-3 top-3 dark:text-white group-hover:opacity-100" />
                    <Link
                      href={{
                        pathname: `/${user.username}/${type.slug}`,
                        query,
                      }}>
                      <a
                        onClick={(e) => {
                          // If a token is required for this event type, add a click listener that checks whether the user verified their wallet or not
                          if (type.metadata.smartContractAddress && !evtsToVerify[type.id]) {
                            e.preventDefault();
                            showToast(
                              "You must verify a wallet with a token belonging to the specified smart contract first",
                              "error"
                            );
                          }
                        }}
                        className="block px-6 py-4"
                        data-testid="event-type-link">
                        <h2 className="font-semibold grow text-neutral-900 dark:text-white">{type.title}</h2>
                        <EventTypeDescription eventType={type} />
                      </a>
                    </Link>
                    {type.isWeb3Active && type.metadata.smartContractAddress && (
                      <CryptoSection
                        id={type.id}
                        pathname={`/${user.username}/${type.slug}`}
                        smartContractAddress={type.metadata.smartContractAddress as string}
                        verified={evtsToVerify[type.id]}
                        setEvtsToVerify={setEvtsToVerify}
                        oneStep
                      />
                    )}
                  </div>
                ))}
            </div>
            {eventTypes.length === 0 && (
              <div className="overflow-hidden rounded-sm shadow">
                <div className="p-8 text-center text-gray-400 dark:text-white">
                  <h2 className="text-3xl font-semibold text-gray-600 font-cal dark:text-white">
                    {t("uh_oh")}
                  </h2>
                  <p className="max-w-md mx-auto">{t("no_event_types_have_been_setup")}</p>
                </div>
              </div>
            )}
          </main>
          <Toaster position="bottom-right" />
        </div>
      )}
    </>
  );
}

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  const username = (context.query.user as string).toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      username: username.toLowerCase(),
    },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      bio: true,
      avatar: true,
      theme: true,
      plan: true,
      away: true,
    },
  });

  if (!user) {
    return {
      notFound: true,
    };
  }

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

  const web3Credentials = credentials.find((credential) => credential.type.includes("_web3"));

  const eventTypesWithHidden = await prisma.eventType.findMany({
    where: {
      AND: [
        {
          teamId: null,
        },
        {
          OR: [
            {
              userId: user.id,
            },
            {
              users: {
                some: {
                  id: user.id,
                },
              },
            },
          ],
        },
      ],
    },
    orderBy: [
      {
        position: "desc",
      },
      {
        id: "asc",
      },
    ],
    select: {
      id: true,
      slug: true,
      title: true,
      length: true,
      description: true,
      hidden: true,
      schedulingType: true,
      price: true,
      currency: true,
      metadata: true,
    },
    take: user.plan === "FREE" ? 1 : undefined,
  });

  const eventTypesRaw = eventTypesWithHidden.filter((evt) => !evt.hidden);

  const eventTypes = eventTypesRaw.map((eventType) => ({
    ...eventType,
    metadata: (eventType.metadata || {}) as JSONObject,
    isWeb3Active:
      web3Credentials && web3Credentials.key
        ? (((web3Credentials.key as JSONObject).isWeb3Active || false) as boolean)
        : false,
  }));

  return {
    props: {
      user,
      eventTypes,
      trpcState: ssr.dehydrate(),
    },
  };
};
