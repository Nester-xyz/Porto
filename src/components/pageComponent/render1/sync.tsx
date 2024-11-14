import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SycnProps = {
  checked: boolean;
  updateChecked: (checked: boolean) => void;
};

const Sync = ({ checked, updateChecked }: SycnProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="showXprofileSwitch">Sync X Profile</Label>
      <Switch
        id="showXprofileSwitch"
        checked={checked}
        onCheckedChange={updateChecked}
      />
    </div>
  );
};

export default Sync;
