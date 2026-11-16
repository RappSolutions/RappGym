import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { LogOut, Settings, UserRound, Save, Trash2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, LanguagePicker } from "@/lib/i18n";
import { emptyTrainingProfile, trainingProfileSchema, type TrainingProfile } from "@/lib/training-profile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfileMenu({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<TrainingProfile>(emptyTrainingProfile);
  const name = typeof user.user_metadata['full_name'] === "string" ? user.user_metadata['full_name'] : typeof user.user_metadata['name'] === "string" ? user.user_metadata['name'] : user.email ?? "";
  const initials = name.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  async function edit() {
    setOpen(true); setBusy(true); setLoaded(false);
    try {
      const { data, error } = await supabase.from("training_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      setProfile(data ? trainingProfileSchema.parse(data) : { ...emptyTrainingProfile });
      setLoaded(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : t("Profilen kunde inte öppnas", "Could not open profile")); }
    finally { setBusy(false); }
  }
  async function save() {
    const parsed = trainingProfileSchema.safeParse(profile);
    if (!parsed.success) { toast.error(t("Kontrollera födelseår, längd och vikt.", "Check birth year, height and weight.")); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("training_profiles").upsert({ ...parsed.data, user_id: user.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success(t("Profil sparad", "Profile saved")); setOpen(false);
      await qc.invalidateQueries({ queryKey: ["training-profile"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : t("Kunde inte spara", "Could not save")); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm(t("Radera dina träningsuppgifter? Loggar, mål och tidigare AI-svar behålls.", "Delete your training profile? Logs, goals and previous AI answers are kept."))) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("training_profiles").delete().eq("user_id", user.id);
      if (error) throw error;
      setProfile({ ...emptyTrainingProfile }); setOpen(false); toast.success(t("Profiluppgifter raderade", "Profile data deleted"));
    } catch (error) { toast.error(error instanceof Error ? error.message : t("Kunde inte radera", "Could not delete")); }
    finally { setBusy(false); }
  }
  return <>
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={t("Mitt konto", "My account")} title={t("Mitt konto", "My account")} className="shrink-0 rounded-full text-brand-yellow hover:bg-brand-royal hover:text-brand-yellow"><Avatar className="size-9 border-2 border-brand-yellow"><AvatarFallback className="bg-brand-royal text-sm font-semibold text-brand-yellow">{initials || <UserRound className="size-5" />}</AvatarFallback></Avatar></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)]"><DropdownMenuLabel><span className="block break-words">{name}</span>{user.email !== name && <span className="block break-words text-xs font-normal text-muted-foreground">{user.email}</span>}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem className="min-h-12" onSelect={() => void edit()}><UserRound />{t("Min träningsprofil", "My training profile")}</DropdownMenuItem><DropdownMenuItem asChild className="min-h-12"><Link to="/settings"><Settings />{t("Inställningar", "Settings")}</Link></DropdownMenuItem><DropdownMenuSeparator /><div className="px-2 py-2"><LanguagePicker flagsOnly /></div><DropdownMenuSeparator /><DropdownMenuItem className="min-h-12" onSelect={() => void onSignOut()}><LogOut />{t("Logga ut", "Sign out")}</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-5"><DialogHeader><DialogTitle className="text-2xl">{t("Min träningsprofil", "My training profile")}</DialogTitle><DialogDescription>{t("Alla uppgifter är valfria och privata. Ange bara det du vill dela.", "All details are optional and private. Enter only what you want to share.")}</DialogDescription></DialogHeader>
      {!loaded ? <LoaderCircle className="size-6 animate-spin" /> : <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!busy) void save(); }}>
        <div className="grid grid-cols-3 gap-3">{([['birth_year', t('Födelseår', 'Birth year'), 1900, new Date().getFullYear(), 1], ['height_cm', t('Längd (cm)', 'Height (cm)'), 30, 300, 0.1], ['weight_kg', t('Vikt (kg)', 'Weight (kg)'), 1, 500, 0.1]] as const).map(([field, label, min, max, step]) => <div key={field} className="space-y-1"><Label htmlFor={`profile-${field}`}>{label}</Label><Input id={`profile-${field}`} type="number" min={min} max={max} step={step} value={profile[field] ?? ""} disabled={busy} onChange={(event) => setProfile((old) => ({ ...old, [field]: event.target.value === "" ? null : Number(event.target.value) }))} /></div>)}</div>
        {([['experience', t('Träningsvana', 'Training experience'), 1000], ['preferences', t('Önskemål', 'Preferences'), 2000], ['limitations', t('Problem & begränsningar', 'Problems & limitations'), 2000]] as const).map(([field,label,max]) => <div key={field} className="space-y-1"><Label htmlFor={`profile-${field}`}>{label}</Label><Textarea id={`profile-${field}`} rows={2} maxLength={max} disabled={busy} value={profile[field]} onChange={(event) => setProfile((old) => ({ ...old, [field]: event.target.value }))} /></div>)}
        <div className="space-y-1"><Label htmlFor="profile-pace">{t("Träningstempo", "Training pace")}</Label><select id="profile-pace" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={profile.pace} disabled={busy} onChange={(event) => setProfile((old) => ({ ...old, pace: event.target.value as TrainingProfile["pace"] }))}><option value="">{t("Ej angivet", "Not set")}</option><option value="relaxed">{t("Lugnt – långa vilor", "Relaxed – long rests")}</option><option value="normal">{t("Normalt", "Normal")}</option><option value="intense">{t("Intensivt – korta vilor", "Intense – short rests")}</option></select></div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("När du ber om AI-råd skickas alltid dessa uppgifter med till AI-tjänsten. AI ger träningsråd, inte diagnos eller behandling. Radering av profilen tar inte bort tidigare AI-svar.", "When you request AI advice, these details are always sent to the AI service. AI provides training advice, not diagnosis or treatment. Deleting your profile does not remove earlier AI answers.")}</p>
        <Button type="submit" disabled={busy} className="w-full"><Save className="size-4" />{t("Spara profil", "Save profile")}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => void remove()} className="w-full text-destructive"><Trash2 className="size-4" />{t("Radera profiluppgifter", "Delete profile data")}</Button>
      </form>}
    </DialogContent></Dialog>
  </>;
}