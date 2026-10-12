import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Admin Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="adminName">Name</Label>
            <Input id="adminName" defaultValue="Admin" />
          </div>
          <div>
            <Label htmlFor="adminRole">Role</Label>
            <Input id="adminRole" defaultValue="Broadcast Ops" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="adminEmail">Email</Label>
            <Input id="adminEmail" type="email" placeholder="admin@aircast.local" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monitoring Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="warnThreshold">Warning threshold</Label>
            <Input id="warnThreshold" type="number" defaultValue={70} />
          </div>
          <div>
            <Label htmlFor="critThreshold">Critical threshold</Label>
            <Input id="critThreshold" type="number" defaultValue={85} />
          </div>
          <div>
            <Label htmlFor="pollInterval">Agent poll interval</Label>
            <Select id="pollInterval" defaultValue="30">
              <option value="15">Every 15 seconds</option>
              <option value="30">Every 30 seconds</option>
              <option value="60">Every 1 minute</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="offlineAfter">Mark offline after</Label>
            <Select id="offlineAfter" defaultValue="5">
              <option value="2">2 minutes of silence</option>
              <option value="5">5 minutes of silence</option>
              <option value="10">10 minutes of silence</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[12.5px]">
          <label className="flex items-center justify-between">
            <span className="text-base-300">Email alerts for critical events</span>
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-accent" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-base-300">In-app notifications for warnings</span>
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-accent" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-base-300">Weekly fleet health summary</span>
            <input type="checkbox" className="h-4 w-4 accent-accent" />
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" size="sm" type="button">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
