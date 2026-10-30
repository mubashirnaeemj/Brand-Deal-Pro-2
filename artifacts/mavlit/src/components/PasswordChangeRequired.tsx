import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

// Shown instead of the app when the server answers 403 password_change_required. Changing the password is not offered in the app yet, so the
// user is told plainly and can log out.
export default function PasswordChangeRequired() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center text-white" data-testid="password-change-required">
      <h1 className="text-xl font-bold">You need to change your password</h1>
      <p role="alert" className="max-w-md text-muted-foreground">
        For your security, MAVLIT needs you to set a new password before you can continue. Changing it is not available in the app yet:
        please contact MAVLIT support to have it reset.
      </p>
      <Button onClick={() => void logout()} data-testid="button-logout-password-change">Log out</Button>
    </div>
  );
}
