import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CgDanger } from "react-icons/cg";
import { Button } from "@/components/ui/button";

interface LoginFormProps {
  onLogin: (identifier: string) => Promise<void>;
  error: string;
  isLoading: boolean;
}

const LoginForm = ({ onLogin, error, isLoading }: LoginFormProps) => {
  const [identifier, setIdentifier] = useState("");

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      alert("Please enter your Bluesky handle or DID.");
      return;
    }

    await onLogin(identifier.trim());
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md p-6 shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-center text-3xl">Connect Bluesky</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            {error && (
              <div
                id="error"
                className="mt-1 text-sm border rounded-md p-2 flex gap-2 bg-red-100 border-red-400 text-red-600 dark:bg-red-900 dark:border-red-700 dark:text-red-100"
              >
                <CgDanger className="flex-shrink-0 mt-1" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="identifier">Handle or DID</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="johndoe.bsky.social"
                className="mt-1"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              You&apos;ll continue in a secure Bluesky OAuth window and then return
              to Porto.
            </p>

            <Button className="w-full mt-4" type="submit" disabled={isLoading}>
              {isLoading ? "Connecting..." : "Continue with Bluesky"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
