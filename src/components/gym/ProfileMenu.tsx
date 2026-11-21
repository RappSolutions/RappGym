import { useUserView } from "@/lib/user-view";
import { confirmDialog } from "@/components/gym/ConfirmHost";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { LogOut, Settings, UserRound, Save, Trash2, LoaderCircle, MapPin, Check, Mail } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import rappSolutionsMark from "@/assets/RS_64.png";
import { useLanguage, LanguagePicker } from "@/lib/i18n";
import { emptyTrainingProfile, trainingProfileSchema, type TrainingProfile } from "@/lib/training-profile";
import { gymsQuery } from "@/lib/gym";
import { useSelectedGym } from "@/hooks/use-gym";
import { useIsAdmin } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContactDialog } from "@/components/gym/ContactDialog";

export function ProfileMenu({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const { t } = useLanguage();
  const { readOnly, view } = useUserView();
  const qc = useQueryClient();
  const { data: gyms = [] } = useQuery(gymsQuery);
  const [gymId, setGym] = useSelectedGym();
  const currentGym = gyms.find((g) => g.id === gymId);
  useEffect(() => { if (gyms.length > 0 && !currentGym) setGym(gyms[0]!.id); }, [gyms, currentGym, setGym]);
  const { isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [gymOpen, setGymOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<TrainingProfile>(emptyTrainingProfile);
  const actorName = typeof user.user_metadata['full_name'] === "string" ? user.user_metadata['full_name'] : typeof user.user_metadata['name'] === "string" ? user.user_metadata['name'] : user.email ?? "";
  const name = readOnly ? view?.name || view?.email || actorName : actorName;
  const email = readOnly ? view?.email : user.email;
  const initials = name.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  async function edit() {
    setOpen(true); setBusy(true); setLoaded(false);
    try {
      const { data, error } = await supabase.from("training_profiles").select("*").eq("user_id", view?.userId ?? user.id).maybeSingle();
      if (error) throw error;
      setProfile(data ? trainingProfileSchema.parse(data) : { ...emptyTrainingProfile });
      setLoaded(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : t("profileMenu.couldNotOpenProfile")); }
    finally { setBusy(false); }
  }
  async function save() {
    if (readOnly) return;
    const parsed = trainingProfileSchema.safeParse(profile);
    if (!parsed.success) { toast.error(t("profileMenu.checkBirthYearHeightAnd")); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("training_profiles").upsert({ ...parsed.data, user_id: user.id, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success(t("profileMenu.profileSaved")); setOpen(false);
      await qc.invalidateQueries({ queryKey: ["training-profile"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : t("profileMenu.couldNotSave")); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (readOnly) return;
    if (!await confirmDialog(t("profileMenu.deleteYourTrainingProfileLogs"))) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("training_profiles").delete().eq("user_id", user.id);
      if (error) throw error;
      setProfile({ ...emptyTrainingProfile }); setOpen(false); toast.success(t("profileMenu.profileDataDeleted"));
    } catch (error) { toast.error(error instanceof Error ? error.message : t("profileMenu.couldNotDelete")); }
    finally { setBusy(false); }
  }
  return <>
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={t("profileMenu.myAccount")} title={t("profileMenu.myAccount")} className="shrink-0 rounded-full text-brand-yellow hover:bg-brand-royal hover:text-brand-yellow"><Avatar className="size-9 border-2 border-brand-yellow"><AvatarFallback className="bg-brand-royal text-sm font-semibold text-brand-yellow">{initials || <UserRound className="size-5" />}</AvatarFallback></Avatar></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)]"><DropdownMenuLabel><span className="block break-words">{name}</span>{email !== name && <span className="block break-words text-xs font-normal text-muted-foreground">{email}</span>}</DropdownMenuLabel><DropdownMenuSeparator />{gyms.length > 0 && <><DropdownMenuItem className="min-h-12" onSelect={() => setGymOpen(true)}><MapPin /><span className="min-w-0"><span className="block text-xs text-muted-foreground">{t("common.location")}</span><span className="block truncate font-medium">{currentGym?.name ?? ""}</span></span></DropdownMenuItem><DropdownMenuSeparator /></>}<DropdownMenuItem className="min-h-12" onSelect={() => void edit()}><UserRound />{t("profileMenu.myTrainingProfile")}</DropdownMenuItem>{isAdmin && <DropdownMenuItem asChild className="min-h-12"><Link to="/settings"><Settings />{t("profileMenu.settings")}</Link></DropdownMenuItem>}<DropdownMenuItem className="min-h-12" disabled={readOnly} onSelect={() => setContactOpen(true)}><Mail />{t("contact.menu")}</DropdownMenuItem><DropdownMenuSeparator /><div className="px-2 py-2"><LanguagePicker flagsOnly /></div><DropdownMenuSeparator /><DropdownMenuItem className="min-h-12" onSelect={() => void onSignOut()}><LogOut />{t("profileMenu.signOut")}</DropdownMenuItem><DropdownMenuSeparator /><a href="https://rappsol.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-accent"><img src={rappSolutionsMark} alt="Rapp Solutions AB" width={64} height={64} className="size-5 shrink-0 rounded-[5px] ring-1 ring-foreground/10" /><span>Provided by <span className="font-semibold text-foreground/80">Rapp Solutions AB</span></span></a></DropdownMenuContent>
    </DropdownMenu>
    <Drawer open={gymOpen} onOpenChange={setGymOpen}><DrawerContent><DrawerHeader><DrawerTitle>{t("common.location")}</DrawerTitle></DrawerHeader>
      <div className="max-h-[60dvh] space-y-1 overflow-y-auto px-4 pb-6">{gyms.map((g) => <button key={g.id} type="button" onClick={() => { setGym(g.id); setGymOpen(false); }} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left hover:bg-muted" aria-pressed={g.id === gymId}><span className="min-w-0 flex-1"><span className="block truncate font-medium">{g.name}</span>{g.description && <span className="block truncate text-xs text-muted-foreground">{g.description}</span>}</span>{g.id === gymId && <Check className="size-5 shrink-0 text-primary" />}</button>)}</div>
    </DrawerContent></Drawer>
    <ContactDialog open={contactOpen} onOpenChange={setContactOpen} gymName={currentGym?.name ?? ""} />
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto p-5"><DialogHeader><DialogTitle className="text-2xl">{t("profileMenu.myTrainingProfile")}</DialogTitle><DialogDescription>{t("profileMenu.allDetailsAreOptionalAnd")}</DialogDescription></DialogHeader>
      {!loaded ? <LoaderCircle className="size-6 animate-spin" /> : <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!busy && !readOnly) void save(); }}>
        <div className="grid grid-cols-3 gap-3">{([['birth_year', t("profileMenu.birthYear"), 1900, new Date().getFullYear(), 1], ['height_cm', t("profileMenu.heightCm"), 30, 300, 0.1], ['weight_kg', t("common.weightKg"), 1, 500, 0.1]] as const).map(([field, label, min, max, step]) => <div key={field} className="space-y-1"><Label htmlFor={`profile-${field}`}>{label}</Label><Input id={`profile-${field}`} type="number" min={min} max={max} step={step} value={profile[field] ?? ""} disabled={readOnly || busy} onChange={(event) => setProfile((old) => ({ ...old, [field]: event.target.value === "" ? null : Number(event.target.value) }))} /></div>)}</div>
        {([['experience', t("profileMenu.trainingExperience"), 1000], ['preferences', t("profileMenu.preferences"), 2000], ['limitations', t("profileMenu.problemsLimitations"), 2000]] as const).map(([field,label,max]) => <div key={field} className="space-y-1"><Label htmlFor={`profile-${field}`}>{label}</Label><Textarea id={`profile-${field}`} rows={2} maxLength={max} disabled={readOnly || busy} value={profile[field]} onChange={(event) => setProfile((old) => ({ ...old, [field]: event.target.value }))} /></div>)}
        <div className="space-y-1"><Label htmlFor="profile-pace">{t("profileMenu.trainingPace")}</Label><select id="profile-pace" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={profile.pace} disabled={readOnly || busy} onChange={(event) => setProfile((old) => ({ ...old, pace: event.target.value as TrainingProfile["pace"] }))}><option value="">{t("profileMenu.notSet")}</option><option value="relaxed">{t("profileMenu.relaxedLongRests")}</option><option value="normal">{t("profileMenu.normal")}</option><option value="intense">{t("profileMenu.intenseShortRests")}</option></select></div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("profileMenu.whenYouRequestAiAdvice")}</p>
        <Button type="submit" disabled={readOnly || busy} className="w-full"><Save className="size-4" />{t("profileMenu.saveProfile")}</Button><Button type="button" variant="ghost" disabled={readOnly || busy} onClick={() => void remove()} className="w-full text-destructive"><Trash2 className="size-4" />{t("profileMenu.deleteProfileData")}</Button>
      </form>}
    </DialogContent></Dialog>
  </>;
}