import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, ShieldCheck, ShieldOff, Loader2, Trash2 } from "lucide-react";

type Factor = { id: string; friendly_name: string | null; status: string; factor_type: string };

export const TwoFactorSetup = () => {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) toast.error(error.message);
    setFactors((data?.totp ?? []) as Factor[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `T-Bode (${new Date().toLocaleDateString()})` });
      if (error) throw error;
      setPendingFactorId(data.id);
      setSecret(data.totp.secret);
      const dataUrl = await QRCode.toDataURL(data.totp.uri, { margin: 1, width: 220 });
      setQrDataUrl(dataUrl);
    } catch (e: any) {
      toast.error(e.message ?? "Neizdevās sākt 2FA reģistrāciju");
    } finally {
      setEnrolling(false);
    }
  };

  const verifyAndActivate = async () => {
    if (!pendingFactorId || !code) return;
    setVerifying(true);
    try {
      const { data: chData, error: chErr } = await supabase.auth.mfa.challenge({ factorId: pendingFactorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: pendingFactorId, challengeId: chData.id, code });
      if (vErr) throw vErr;
      toast.success("2FA aktivizēts ✅");
      setPendingFactorId(null);
      setQrDataUrl(null);
      setSecret(null);
      setCode("");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Nepareizs kods");
    } finally {
      setVerifying(false);
    }
  };

  const removeFactor = async (factorId: string) => {
    if (!confirm("Vai tiešām noņemt 2FA?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) toast.error(error.message);
    else { toast.success("2FA noņemts"); refresh(); }
  };

  const verifiedFactor = factors.find(f => f.status === "verified");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Divfaktoru autentifikācija (2FA)
        </CardTitle>
        <CardDescription>
          Aizsargā kontu ar kodu no autentifikatora lietotnes (Google Authenticator, Authy, 1Password u.c.).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Ielādē...
          </div>
        )}

        {!loading && verifiedFactor && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/30">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">2FA ir aktivizēts</p>
                <p className="text-xs text-muted-foreground">{verifiedFactor.friendly_name ?? "TOTP"}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeFactor(verifiedFactor.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {!loading && !verifiedFactor && !pendingFactorId && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldOff className="w-4 h-4" />
              <span>2FA nav aktivizēts</span>
              <Badge variant="destructive" className="ml-auto">Ieteicams</Badge>
            </div>
            <Button onClick={startEnroll} disabled={enrolling}>
              {enrolling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Aktivizēt 2FA
            </Button>
          </div>
        )}

        {pendingFactorId && qrDataUrl && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">1. Skenē QR kodu ar autentifikatoru:</p>
              <div className="bg-white p-3 rounded-lg inline-block border">
                <img src={qrDataUrl} alt="2FA QR kods" width={220} height={220} />
              </div>
              {secret && (
                <p className="text-xs text-muted-foreground mt-2">
                  Vai ievadi manuāli: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{secret}</code>
                </p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium mb-2">2. Ievadi 6 ciparu kodu:</p>
              <div className="flex gap-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  className="font-mono text-lg tracking-widest max-w-[160px]"
                />
                <Button onClick={verifyAndActivate} disabled={code.length !== 6 || verifying}>
                  {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Apstiprināt
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};