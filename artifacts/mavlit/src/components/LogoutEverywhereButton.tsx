import { useState } from "react";
import { Loader2, MonitorOff } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function LogoutEverywhereButton() {
  const { logoutEverywhere } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    if (pending) return;
    setPending(true);
    try {
      await logoutEverywhere();
      toast({ title: "You have been signed out on all devices" });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't sign you out everywhere", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setPending(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <AlertDialogTrigger asChild>
        <button title="Log out of all devices" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
          <MonitorOff size={13} />
          <span className="hidden md:inline">Log out of all devices</span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Log out of all devices?</AlertDialogTitle>
          <AlertDialogDescription>
            This will sign you out on every device, including this one. You will need to log in again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button onClick={() => void confirm()} disabled={pending} aria-busy={pending}>
            {pending && <Loader2 size={14} className="mr-2 animate-spin" />}
            Log out everywhere
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
