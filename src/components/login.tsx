import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Login = () => {

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md p-6 bg-white shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-center text-4xl">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="userName">UserName</Label>
              <Input id="userName" type="text" placeholder="johndoe.bsky.social" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">App Password</Label>
              <Input id="password" type="password" placeholder="Enter your password" className="mt-1" />
            </div>
            <Button className="w-full mt-4">Login</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
