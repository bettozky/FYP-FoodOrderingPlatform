import React, { useEffect, useState } from "react";
import EmptyState from "../../../shared/components/EmptyState";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { api, errorText } from "../../../shared/api/client";
import ScreenHeader from "../../../shared/components/ScreenHeader";
import Badge from "../../../shared/components/Badge";
import { colors, spacing, type } from "../../../shared/theme/theme";
import { merchantJobStyles as s } from "../styles";
import i18n from "../../../shared/i18n";
import { jobTypeName, roleName } from "../applicationStatus";
import { useTranslation } from "react-i18next";

export type JobRole = "Waitstaff" | "Line Cook" | "Cashier" | "Barista" | "Kitchen Helper" | "Dishwasher";
export type JobType = "Full-Time" | "Part-Time" | "Contract";

export interface JobPosting {
  id: string;
  title: string;
  role: JobRole | string;
  type: JobType;
  salaryRange: string;
  openings: number;
  applicantsCount: number;
  newApplicants: number;
  description: string;
  perks: string;
  status: "active" | "closed";
  postedAt: number;
}

const COMMON_ROLES: JobRole[] = [
  "Waitstaff",
  "Line Cook",
  "Cashier",
  "Barista",
  "Kitchen Helper",
];

const JOB_TYPES: JobType[] = ["Full-Time", "Part-Time", "Contract"];

const ago = (t: number) => {
  const d = Math.floor((Date.now() - t) / 86400000);
  return d <= 0 ? i18n.t("jobBoard.today") : i18n.t("jobBoard.daysAgo", { count: d });
};
const fromApi = (j: any): JobPosting => ({
  id: j.id, title: j.title, role: j.role ?? "Staff", type: (j.type as JobType) ?? "Part-Time", salaryRange: j.pay,
  openings: j.openings ?? 1, applicantsCount: j.applicants ?? 0, newApplicants: j.newApplicants ?? 0, description: j.description ?? "", perks: j.perks ?? "",
  status: j.open ? "active" : "closed", postedAt: j.postedAt,
});

export default function MerchantJobBoardScreen({ navigation }: any) {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [message, setMessage] = useState("");
  const load = () =>
    api<{ jobs: any[] }>("GET", "/merchant/jobs").then((r) => setJobs(r.jobs.map(fromApi))).catch((e) => setMessage(errorText(e)));
  useEffect(() => {
    load();
  }, []);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "closed">("active");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Form Fields
  const [jobTitle, setJobTitle] = useState("");
  const [jobRole, setJobRole] = useState<string>("Waitstaff");
  const [jobType, setJobType] = useState<JobType>("Full-Time");
  const [salaryRange, setSalaryRange] = useState("RM 2,000 - RM 2,500 / month");
  const [openings, setOpenings] = useState("2");
  const [description, setDescription] = useState("");
  const [perks, setPerks] = useState("Staff meal provided, EPF & SOCSO");

  // Filtered List
  const filteredJobs = jobs.filter((j) => {
    if (activeTab === "active") return j.status === "active";
    if (activeTab === "closed") return j.status === "closed";
    return true;
  });

  // Open Modal for Creating Job
  const handleOpenAddModal = () => {
    setEditingJobId(null);
    setJobTitle("");
    setJobRole("Waitstaff");
    setJobType("Full-Time");
    setSalaryRange("RM 2,000 - RM 2,500 / month");
    setOpenings("2");
    setDescription("");
    setPerks("Staff meal provided, EPF & SOCSO");
    setIsModalOpen(true);
  };

  // Open Modal for Editing Job
  const handleOpenEditModal = (job: JobPosting) => {
    setEditingJobId(job.id);
    setJobTitle(job.title);
    setJobRole(job.role);
    setJobType(job.type as JobType);
    setSalaryRange(job.salaryRange);
    setOpenings(job.openings.toString());
    setDescription(job.description);
    setPerks(job.perks);
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveJob = () => {
    if (!jobTitle.trim() || !salaryRange.trim()) {
      alert(t("jobBoard.needTitle"));
      return;
    }

    const body = {
      title: jobTitle.trim(),
      role: jobRole,
      type: jobType,
      pay: salaryRange.trim(),
      openings: parseInt(openings, 10) || 1,
      description: description.trim(),
      perks: perks.trim(),
    };
    const req = editingJobId ? api("PATCH", `/merchant/jobs/${editingJobId}`, body) : api("POST", "/merchant/jobs", body);
    req.then(() => { setIsModalOpen(false); setMessage(""); load(); }).catch((e) => setMessage(errorText(e)));
  };

  // Toggle Vacancy Status (Close / Reopen)
  const handleToggleStatus = (jobId: string) => {
    const j = jobs.find((x) => x.id === jobId);
    if (!j) return;
    api("PATCH", `/merchant/jobs/${jobId}`, { open: j.status !== "active" }).then(load).catch((e) => setMessage(errorText(e)));
  };

  // Delete Job Posting
  const handleDeleteJob = (jobId: string) => {
    api("DELETE", `/merchant/jobs/${jobId}`).then(load).catch((e) => setMessage(errorText(e)));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title={t("dash.jobs")}
        subtitle={t("jobBoard.subtitle", { active: jobs.filter((j) => j.status === "active").length, total: jobs.reduce((acc, j) => acc + j.applicantsCount, 0) })}
      />

      {message ? <Text style={{ color: colors.danger, paddingHorizontal: spacing.lg }}>{message}</Text> : null}
      <FlatList
        data={filteredJobs}
        ListEmptyComponent={<EmptyState icon="briefcase-outline" title={t("jobBoard.empty")} hint={t("jobBoard.emptyHint")} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={s.headerSection}>
            {/* Post Job Action Button */}
            <Pressable
              style={({ hovered }: any) => [s.postBtn, hovered && s.btnHover]}
              onPress={handleOpenAddModal}
            >
              <Text style={s.postBtnText}>+ {t("jobBoard.postNew")}</Text>
            </Pressable>

            {/* Status Filter Tabs */}
            <View style={s.tabRow}>
              {(["active", "closed", "all"] as const).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    style={[s.tabBtn, isActive && s.tabBtnActive]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[s.tabText, isActive && s.tabTextActive]}>
                      {tab === "active"
                        ? t("jobBoard.tabActive")
                        : tab === "closed"
                        ? t("jobBoard.tabClosed")
                        : t("jobBoard.tabAll")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isClosed = item.status === "closed";

          return (
            <View style={[s.card, isClosed && s.cardClosed]}>
              {/* Header: Title, Role & Status Badge */}
              <View style={s.rowBetween}>
                <View style={s.titleGroup}>
                  <Text style={[type.h3, { color: isClosed ? colors.stone : colors.text }]}>
                    {item.title}
                  </Text>
                  <Badge label={roleName(item.role)} tone="neutral" />
                </View>

                <Badge
                  label={isClosed ? t("jobBoard.closed") : t("jobBoard.hiring")}
                  tone={isClosed ? "neutral" : "success"}
                />
              </View>

              {/* Meta: Salary, Employment Type & Applicants */}
              <View style={s.metaRow}>
                <View style={s.salaryBadge}>
                  <Text style={s.salaryText}><Ionicons name="cash-outline" size={13} /> {item.salaryRange}</Text>
                </View>

                <View style={s.typeBadge}>
                  <Text style={s.typeText}><Ionicons name="time-outline" size={13} /> {jobTypeName(item.type)}</Text>
                </View>

                <View style={s.applicantBadge}>
                  <Text style={s.applicantText}>
                    <Ionicons name="people-outline" size={13} /> {t("jobBoard.counts", { applicants: item.applicantsCount, openings: item.openings })}
                  </Text>
                </View>

                <Text style={type.small}>{t("jobBoard.posted", { when: ago(item.postedAt) })}</Text>
              </View>

              {/* Job Scope / Responsibilities */}
              {item.description ? (
                <Text style={s.descriptionText}>{item.description}</Text>
              ) : null}

              {/* Perks & Benefits Box */}
              {item.perks ? (
                <View style={s.perksBox}>
                  <Text style={s.perksTitle}>{t("jobBoard.benefits")}</Text>
                  <Text style={s.perksContent}>{item.perks}</Text>
                </View>
              ) : null}

              {/* Applicants: opens the people who applied for this job in the customer app */}
              <Pressable
                style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: item.newApplicants ? colors.turmeric : colors.border, backgroundColor: item.newApplicants ? colors.amberTint : colors.surface, marginBottom: spacing.sm }}
                onPress={() => navigation.navigate("MerchantApplicants", { jobId: item.id, jobTitle: item.title })}
                accessibilityRole="button"
                accessibilityLabel={t("jobBoard.applicantsFor", { title: item.title })}
                testID={`applicants-${item.id}`}
              >
                <Ionicons name="people-outline" size={18} color={colors.ink} />
                <Text style={{ flex: 1, fontWeight: "700", color: colors.ink }}>
                  {t("drawer.applicants")} ({item.applicantsCount}){item.newApplicants ? ` · ${t("jobBoard.new", { n: item.newApplicants })}` : ""}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.stone} />
              </Pressable>

              {/* Action Buttons */}
              <View style={s.actionRow}>
                <Pressable
                  style={[s.actionBtn, s.editBtn]}
                  onPress={() => handleOpenEditModal(item)}
                >
                  <Text style={s.editBtnText}>{t("jobBoard.editDetails")}</Text>
                </Pressable>

                <Pressable
                  style={[
                    s.actionBtn,
                    s.toggleStatusBtn,
                    isClosed ? s.reopenBtn : s.closeBtn,
                  ]}
                  onPress={() => handleToggleStatus(item.id)}
                >
                  <Text style={isClosed ? s.reopenBtnText : s.closeBtnText}>
                    {isClosed ? t("jobBoard.reopen") : t("jobBoard.close")}
                  </Text>
                </Pressable>

                <Pressable
                  style={[s.actionBtn, s.deleteBtn]}
                  onPress={() => handleDeleteJob(item.id)}
                >
                  <Text style={s.deleteBtnText}>{t("photo.remove")}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {/* ================= MODAL: POST / EDIT JOB OPENING ================= */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={type.h2}>
                {editingJobId ? t("jobBoard.editTitle") : t("jobBoard.postNew")}
              </Text>
              <Text style={[type.bodyMuted, { marginBottom: spacing.md }]}>
                {t("jobBoard.formIntro")}
              </Text>

              {/* Job Title */}
              <Text style={s.inputLabel}>{t("jobBoard.title")}</Text>
              <TextInput
                style={s.input}
                placeholder={t("jobBoard.titlePh")}
                value={jobTitle}
                onChangeText={setJobTitle}
              />

              {/* F&B Primary Role Picker */}
              <Text style={s.inputLabel}>{t("jobBoard.role")}</Text>
              <View style={s.quickChipRow}>
                {COMMON_ROLES.map((role) => {
                  const isSelected = jobRole === role;
                  return (
                    <Pressable
                      key={role}
                      style={[s.quickChip, isSelected && s.quickChipActive]}
                      onPress={() => setJobRole(role)}
                    >
                      <Text style={[s.quickChipText, isSelected && s.quickChipTextActive]}>
                        {roleName(role)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Employment Type */}
              <Text style={s.inputLabel}>{t("jobBoard.type")}</Text>
              <View style={s.quickChipRow}>
                {JOB_TYPES.map((jt) => {
                  const isSelected = jobType === jt;
                  return (
                    <Pressable
                      key={jt}
                      style={[s.quickChip, isSelected && s.quickChipActive]}
                      onPress={() => setJobType(jt)}
                    >
                      <Text style={[s.quickChipText, isSelected && s.quickChipTextActive]}>
                        {jobTypeName(jt)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Salary Range & Number of Openings */}
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
                <View style={{ flex: 2 }}>
                  <Text style={s.inputLabel}>{t("jobBoard.salary")}</Text>
                  <TextInput
                    style={s.input}
                    placeholder={t("jobBoard.salaryPh")}
                    value={salaryRange}
                    onChangeText={setSalaryRange}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>{t("jobBoard.openings")}</Text>
                  <TextInput
                    style={s.input}
                    placeholder={t("menu.eg", { v: "2" })}
                    keyboardType="numeric"
                    value={openings}
                    onChangeText={setOpenings}
                  />
                </View>
              </View>

              {/* Responsibilities & Description */}
              <Text style={s.inputLabel}>{t("jobBoard.duties")}</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder={t("jobBoard.dutiesPh")}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />

              {/* Staff Perks & Welfare */}
              <Text style={s.inputLabel}>{t("jobBoard.perks")}</Text>
              <TextInput
                style={s.input}
                placeholder={t("jobBoard.perksPh")}
                value={perks}
                onChangeText={setPerks}
              />

              {/* Modal Action Buttons */}
              <View style={s.modalBtnRow}>
                <Pressable
                  style={[s.modalBtn, s.cancelBtn]}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={s.cancelBtnText}>{t("common.cancel")}</Text>
                </Pressable>

                <Pressable
                  style={[s.modalBtn, s.saveBtn]}
                  onPress={handleSaveJob}
                >
                  <Text style={s.saveBtnText}>
                    {editingJobId ? t("ann.saveChanges") : t("jobBoard.publish")}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}