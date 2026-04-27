import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

/**
 * Wraps admin content. If the user has a verified TOTP factor but the current
 * session is only AAL1, requires the user to enter a 6-digit code (AAL2) before
 * showing children. Users without enrolled MFA see a strong recommendation
 * banner but are still allowed in.
 */
export const AdminMfaGate = ({ children }: { children: React.ReactNode }) => {
  const [checking, setChecking] = useState(true);
  const [needsChallenge, setNeedsChallenge] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [hasMfa, setHasMfa] = useState(false);

  const checkAal = async () => {
    setChecking(true);
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: list } = await supabase.auth.mfa.listFactors();
      const verified = (list?.totp ?? []).find((f: any) => f.status === "verified");
      setHasMfa(!!verified);
      if (verified && aal?.currentLevel !== "aal2" && aal?.nextLevel === "aal2") {
        setFactorId(verified.id);
        const { data: ch, error } = await supabase.auth.mfa.challenge({ factorId: verified.id });
        if (error) throw error;
        setChallengeId(ch.id);
        setNeedsChallenge(true);
      } else {
        setNeedsChallenge(false);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { checkAal(); }, []);

  const verify = async () => {
    if (!factorId || !challengeId) return;
    setVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (error) throw error;
      toast.success("Apstiprināts");
      setNeedsChallenge(false);
      setCode("");
    } catch (e: any) {
      toast.error(e.message ?? "Nepareizs kods");
    } finally {
      setVerifying(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (needsChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Apstiprini ar 2FA
            </CardTitle>
            <CardDescription>
              Ievadi 6 ciparu kodu no autentifikatora lietotnes, lai piekļūtu admin panelim.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
              autoFocus
              className="font-mono text-lg tracking-widest"
              onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) verify(); }}
            />
            <Button onClick={verify} disabled={code.length !== 6 || verifying} className="w-full">
              {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Apstiprināt
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {!hasMfa && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-900 px-4 py-2.5 text-sm">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Tavam admin kontam nav 2FA. Aktivizē to drošībai.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/profile?tab=security">Aktivizēt</Link>
            </Button>
          </div>
        </div>
      )}
      {children}
    </>
  );
};