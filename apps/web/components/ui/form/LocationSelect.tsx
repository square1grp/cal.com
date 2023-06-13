import type { GroupBase, Props, SingleValue } from "react-select";
import { components } from "react-select";

import type { EventLocationType } from "@calcom/app-store/locations";
import { classNames } from "@calcom/lib";
import cx from "@calcom/lib/classNames";
import { Select } from "@calcom/ui";

export type LocationOption = {
  label: string;
  value: EventLocationType["type"];
  icon?: string;
  disabled?: boolean;
  address?: string;
};

export type SingleValueLocationOption = SingleValue<LocationOption>;

export type GroupOptionType = GroupBase<LocationOption>;

const OptionWithIcon = ({ icon, label }: { icon?: string; label: string }) => {
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <img
          src={icon}
          alt="cover"
          // invert all the icons except app icons
          className={cx("h-3.5 w-3.5", icon && !icon.startsWith("/app-store") && "dark:invert")}
        />
      )}
      <span className={classNames("text-sm font-medium")}>{label}</span>
    </div>
  );
};

export default function LocationSelect(props: Props<LocationOption, false, GroupOptionType>) {
  return (
    <Select<LocationOption>
      name="location"
      id="location-select"
      components={{
        Option: (props) => (
          <components.Option {...props}>
            <OptionWithIcon icon={props.data.icon} label={props.data.label} />
          </components.Option>
        ),
        SingleValue: (props) => (
          <components.SingleValue {...props}>
            <OptionWithIcon icon={props.data.icon} label={props.data.label} />
          </components.SingleValue>
        ),
      }}
      formatOptionLabel={(e) => (
        <div className="flex items-center gap-3">
          {e.icon && <img src={e.icon} alt="app-icon" className="h-5 w-5" />}
          <span>{e.label}</span>
        </div>
      )}
      formatGroupLabel={(e) => <p className="text-default text-xs font-medium">{e.label}</p>}
      {...props}
    />
  );
}
