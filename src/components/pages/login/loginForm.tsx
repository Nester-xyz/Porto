import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CgDanger } from "react-icons/cg";
import { BsFillInfoCircleFill } from "react-icons/bs";
import { HiEye, HiEyeSlash } from "react-icons/hi2";
import { Button } from "@/components/ui/button";

type LoginFormProps = {
  onLogin: (userName: string, password: string) => void;
  error: string;
  isLoading: boolean;
};

const LoginForm = ({ onLogin, error, isLoading }: LoginFormProps) => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showToolTip, setShowToolTip] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    if (userName === "" || password === "") {
      alert("Please fill in both the username and password.");
    } else {
      onLogin(userName, password);
    }
  };

  const appPasswordRoute = () => {
    window.open(
      "https://github.com/bluesky-social/atproto-ecosystem/blob/main/app-passwords.md",
      "_blank",
    );
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md p-6 bg-white shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-center text-4xl">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            {/* Error */}
            <div className="flex flex-col gap-1">
              {error && (
                <div
                  id="error"
                  className="mt-1 text-sm text-red-600 bg-red-100 border border-red-400 rounded-md p-2 flex items-center"
                >
                  <CgDanger />
                  {error}
                </div>
              )}
            </div>
            {/* Username Input */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="userName">UserName</Label>
              <Input
                id="userName"
                type="text"
                placeholder="johndoe.bsky.social"
                className="mt-1"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1 relative">
              {showToolTip && (
                <div className="bg-gray-100 p-3 rounded-md text-sm absolute -translate-y-1/2 -top-1/2">
                  Temporary password for third party applications!
                </div>
              )}
              <div className="flex justify-start gap-2">
                <Label htmlFor="password">App Password</Label>
                <div
                  className="text-sm cursor-pointer"
                  onMouseEnter={() => setShowToolTip(true)}
                  onClick={appPasswordRoute}
                  onMouseLeave={() => setShowToolTip(false)}
                >
                  <BsFillInfoCircleFill />
                </div>
              </div>
              <div className="flex items-center border rounded-md px-3 ">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className=" border-none focus-visible:ring-0 p-0"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div
                  className="ml-2 cursor-pointer"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <HiEyeSlash size={20} />
                  ) : (
                    <HiEye size={20} />
                  )}
                </div>
              </div>
            </div>

            {/* Login Button */}
            <Button
              className="w-full mt-4"
              type="submit"
              disabled={!userName || !password || isLoading} // Disables button if fields are empty
            >
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
