import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HiEye } from "react-icons/hi";
import { HiEyeSlash } from "react-icons/hi2";
import { BsFillInfoCircleFill } from "react-icons/bs";
import AtpAgent, { AtpSessionData, AtpSessionEvent } from "@atproto/api";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showToolTip, setShowToolTip] = useState(false);
  const [loggedInSuccess, setLoggedInSuccess] = useState<boolean>(false);
  const [agent, setAgent] = useState<AtpAgent | null>(null);

  // Initialize agent only once when component mounts
  useEffect(() => {
    if (!agent) {
      const agentInstance = new AtpAgent({
        service: "https://bsky.social",
        persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
          if (!sess) return;

          // Store session data
          localStorage.setItem("handle", sess.handle);
          localStorage.setItem("accessJWT", sess.accessJwt);
          localStorage.setItem("refreshJWT", sess.refreshJwt);
          localStorage.setItem("did", sess.did);

          setLoggedInSuccess(true);

          // Chrome storage update
        },
      });

      setAgent(agentInstance);
    }
  }, []); // Empty dependency array ensures this runs only once

  const appPasswordRoute = () => {
    window.open(
      "https://github.com/bluesky-social/atproto-ecosystem/blob/main/app-passwords.md",
      "_blank",
    );
  };

  const onClick = () => {
    if (userName === "" || password === "") {
      alert("Please fill in both the username and password.");
    } else {
      console.log("Logging in with:", { userName, password });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md p-6 bg-white shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-center text-4xl">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
              onClick={onClick}
              disabled={!userName || !password} // Disables button if fields are empty
            >
              Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
