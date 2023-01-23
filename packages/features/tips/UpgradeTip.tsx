import { useMemo } from "react";
import type { ReactNode } from "react";

import { classNames } from "@calcom/lib";
import { useHasTeamPlan } from "@calcom/lib/hooks/useHasTeamPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
// import isCalcom from "@calcom/lib/isCalcom";
import { trpc } from "@calcom/trpc/react";
import { EmptyScreen, Icon } from "@calcom/ui";

import TeamList from "../ee/teams/components/TeamList";

const isCalcom = true;
export function UpgradeTip({
  dark,
  title,
  description,
  background,
  features,
  buttons,
  isParentLoading,
  children,
}: {
  dark?: boolean;
  title: string;
  description: string;
  background: string;
  features: Array<{ icon: JSX.Element; title: string; description: string }>;
  buttons?: JSX.Element;
  /**Chldren renders when the user is in a team */
  children: JSX.Element;
  isParentLoading?: ReactNode;
}) {
  const { data } = trpc.viewer.teams.list.useQuery();

  const invites = useMemo(() => data?.filter((m) => !m.accepted) || [], [data]);
  const { t } = useLocale();
  const { isLoading, hasTeamPlan } = useHasTeamPlan();

  if (hasTeamPlan) return children;

  if (!isCalcom)
    return <EmptyScreen Icon={Icon.FiUsers} headline={title} description={description} buttonRaw={buttons} />;

  if (isParentLoading || isLoading) return <>{isParentLoading}</>;

  return (
    <>
      <div className="-mt-10 rtl:ml-4 sm:mt-0 md:rtl:ml-0 lg:-mt-6">
        <div
          className="flex w-full justify-between overflow-hidden rounded-lg pt-4 pb-10 md:min-h-[295px] md:pt-10"
          style={{
            background: `url(${background})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}>
          <div className="mt-3 px-8 sm:px-14">
            <h1 className={classNames("font-cal text-3xl", dark && "text-white")}>{t(title)}</h1>
            <p className={classNames("my-4 max-w-sm", dark ? "text-white" : "text-gray-600")}>
              {t(description)}
            </p>
            {buttons}
          </div>
        </div>
        {invites.length > 0 && (
          <div className="my-4">
            <h3 className="font-cal mb-4 text-xl">{t("open_invitations")}</h3>
            <TeamList teams={invites} />
          </div>
        )}
        <div className="mt-4 grid-cols-3 md:grid md:gap-4">
          {invites.length === 0 &&
            features.map((feature) => (
              <div
                key={feature.title}
                className="mb-4 min-h-[180px] w-full rounded-md bg-gray-50 p-8 md:mb-0">
                {feature.icon}
                <h2 className="font-cal mt-4 text-lg">{feature.title}</h2>
                <p className="text-gray-700">{feature.description}</p>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
