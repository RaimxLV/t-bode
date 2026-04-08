import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Save, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FAQForm {
  id?: string;
  question_lv: string;
  answer_lv: string;
  question_en: string;
  answer_en: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FAQ: FAQForm = { question_lv: "", answer_lv: "", question_en: "", answer_en: "", sort_order: 0, is_active: true };

interface FAQManagerProps {
  faqs: any[];
  loading: boolean;
  onRefresh: () => void;
}

export const FAQManager = ({ faqs, loading, onRefresh }: FAQManagerProps) => {
  const { t } = useTranslation();
  const [editingFaq, setEditingFaq] = useState<FAQForm | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editingFaq || !editingFaq.question_lv || !editingFaq.answer_lv) { toast.error(t("admin.faqSaveError")); return; }
    setSaving(true);
    const payload = { question_lv: editingFaq.question_lv, answer_lv: editingFaq.answer_lv, question_en: editingFaq.question_en, answer_en: editingFaq.answer_en, sort_order: editingFaq.sort_order, is_active: editingFaq.is_active };
    if (editingFaq.id) {
      const { error } = await supabase.from("faqs").update(payload).eq("id", editingFaq.id);
      if (error) toast.error(t("admin.faqSaveError"));
      else toast.success(t("admin.faqSaved"));
    } else {
      const { error } = await supabase.from("faqs").insert(payload);
      if (error) toast.error(t("admin.faqSaveError"));
      else toast.success(t("admin.faqCreated"));
    }
    setSaving(false); setDialogOpen(false); setEditingFaq(null); onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.faqDeleteConfirm"))) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) toast.error(t("admin.faqDeleteError"));
    else { toast.success(t("admin.faqDeleted")); onRefresh(); }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingFaq({ ...EMPTY_FAQ }); setDialogOpen(true); }} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> {t("admin.newFaq")}</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12 font-body">{t("admin.loadingFaqs")}</p>
      ) : faqs.length === 0 ? (
        <div className="text-center py-20"><p className="text-muted-foreground font-body">{t("admin.noFaqs")}</p></div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq) => (
            <Card key={faq.id} className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-body">#{faq.sort_order}</span>
                      {!faq.is_active && <Badge variant="secondary" className="text-xs">Neaktīvs</Badge>}
                    </div>
                    <h3 className="font-body font-semibold text-sm truncate">{faq.question_lv}</h3>
                    <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-2">{faq.answer_lv}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingFaq({ id: faq.id, question_lv: faq.question_lv, answer_lv: faq.answer_lv, question_en: faq.question_en, answer_en: faq.answer_en, sort_order: faq.sort_order, is_active: faq.is_active }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(faq.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingFaq?.id ? t("admin.editFaq") : t("admin.newFaq")}</DialogTitle>
          </DialogHeader>
          {editingFaq && (
            <div className="space-y-4">
              <div>
                <Label className="font-body text-sm">{t("admin.questionLv")}</Label>
                <Input value={editingFaq.question_lv} onChange={(e) => setEditingFaq({ ...editingFaq, question_lv: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="font-body text-sm">{t("admin.answerLv")}</Label>
                <Textarea value={editingFaq.answer_lv} onChange={(e) => setEditingFaq({ ...editingFaq, answer_lv: e.target.value })} className="mt-1" rows={3} />
              </div>
              <div>
                <Label className="font-body text-sm">{t("admin.questionEn")}</Label>
                <Input value={editingFaq.question_en} onChange={(e) => setEditingFaq({ ...editingFaq, question_en: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="font-body text-sm">{t("admin.answerEn")}</Label>
                <Textarea value={editingFaq.answer_en} onChange={(e) => setEditingFaq({ ...editingFaq, answer_en: e.target.value })} className="mt-1" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-body text-sm">{t("admin.sortOrder")}</Label>
                  <Input type="number" value={editingFaq.sort_order} onChange={(e) => setEditingFaq({ ...editingFaq, sort_order: parseInt(e.target.value) || 0 })} className="mt-1" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={editingFaq.is_active} onCheckedChange={(v) => setEditingFaq({ ...editingFaq, is_active: v })} />
                  <Label className="font-body text-sm">{t("admin.faqActive")}</Label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("admin.cancel")}</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? t("admin.saving") : t("admin.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};