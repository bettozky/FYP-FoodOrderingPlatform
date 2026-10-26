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
  description: string;
  perks: string;
  status: "active" | "closed";
  postedDate: string;
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
  return d <= 0 ? "today" : d === 1 ? "1 day ago" : `${d} days ago`;
};
const fromApi = (j: any): JobPosting => ({
  id: j.id, title: j.title, role: j.role ?? "Staff", type: (j.type as JobType) ?? "Part-Time", salaryRange: j.pay,
  openings: j.openings ?? 1, applicantsCount: j.applicants ?? 0, description: j.description ?? "", perks: j.perks ?? "",
  status: j.open ? "active" : "closed", postedDate: ago(j.postedAt),
});

export default function MerchantJobBoardScreen() {
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
      alert("Please enter a job title and salary range.");
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
        title="Restaurant Job Board"
        subtitle={`${jobs.filter((j) => j.status === "active").length} active vacancies · ${jobs.reduce((acc, j) => acc + j.applicantsCount, 0)} total candidates`}
      />

      {message ? <Text style={{ color: colors.danger, paddingHorizontal: spacing.lg }}>{message}</Text> : null}
      <FlatList
        data={filteredJobs}
        ListEmptyComponent={<EmptyState icon="briefcase-outline" title="No job postings" hint="Post an opening and students on ScootMeal will see it." />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={s.headerSection}>
            {/* Post Job Action Button */}
            <Pressable
              style={({ hovered }: any) => [s.postBtn, hovered && s.btnHover]}
              onPress={handleOpenAddModal}
            >
              <Text style={s.postBtnText}>+ Post New Job Opening</Text>
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
                        ? "Active Vacancies"
                        : tab === "closed"
                        ? "Closed / Filled"
                        : "All Postings"}
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
                  <Badge label={item.role} tone="neutral" />
                </View>

                <Badge
                  label={isClosed ? "CLOSED" : "HIRING ACTIVE"}
                  tone={isClosed ? "neutral" : "success"}
                />
              </View>

              {/* Meta: Salary, Employment Type & Applicants */}
              <View style={s.metaRow}>
                <View style={s.salaryBadge}>
                  <Text style={s.salaryText}><Ionicons name="cash-outline" size={13} /> {item.salaryRange}</Text>
                </View>

                <View style={s.typeBadge}>
                  <Text style={s.typeText}><Ionicons name="time-outline" size={13} /> {item.type}</Text>
                </View>

                <View style={s.applicantBadge}>
                  <Text style={s.applicantText}>
                    <Ionicons name="people-outline" size={13} /> {item.applicantsCount} Applicants ({item.openings} Openings)
                  </Text>
                </View>

                <Text style={type.small}>Posted {item.postedDate}</Text>
              </View>

              {/* Job Scope / Responsibilities */}
              {item.description ? (
                <Text style={s.descriptionText}>{item.description}</Text>
              ) : null}

              {/* Perks & Benefits Box */}
              {item.perks ? (
                <View style={s.perksBox}>
                  <Text style={s.perksTitle}>Staff Benefits & Welfare</Text>
                  <Text style={s.perksContent}>{item.perks}</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={s.actionRow}>
                <Pressable
                  style={[s.actionBtn, s.editBtn]}
                  onPress={() => handleOpenEditModal(item)}
                >
                  <Text style={s.editBtnText}>Edit Details</Text>
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
                    {isClosed ? "Reopen Vacancy" : "Close Vacancy"}
                  </Text>
                </Pressable>

                <Pressable
                  style={[s.actionBtn, s.deleteBtn]}
                  onPress={() => handleDeleteJob(item.id)}
                >
                  <Text style={s.deleteBtnText}>Remove</Text>
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
                {editingJobId ? "Edit Job Vacancy" : "Post New Job Opening"}
              </Text>
              <Text style={[type.bodyMuted, { marginBottom: spacing.md }]}>
                Recruit kitchen, service, and floor staff for your restaurant.
              </Text>

              {/* Job Title */}
              <Text style={s.inputLabel}>Job Title</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Full-Time Sarawak Laksa Line Cook"
                value={jobTitle}
                onChangeText={setJobTitle}
              />

              {/* F&B Primary Role Picker */}
              <Text style={s.inputLabel}>Role Category</Text>
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
                        {role}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Employment Type */}
              <Text style={s.inputLabel}>Employment Type</Text>
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
                        {jt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Salary Range & Number of Openings */}
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
                <View style={{ flex: 2 }}>
                  <Text style={s.inputLabel}>Salary / Wages</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. RM 2,200 - RM 2,600 / month"
                    value={salaryRange}
                    onChangeText={setSalaryRange}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.inputLabel}>Openings</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. 2"
                    keyboardType="numeric"
                    value={openings}
                    onChangeText={setOpenings}
                  />
                </View>
              </View>

              {/* Responsibilities & Description */}
              <Text style={s.inputLabel}>Responsibilities & Duties</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Key expectations (e.g. food prep, table service, cash handling)"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />

              {/* Staff Perks & Welfare */}
              <Text style={s.inputLabel}>Staff Perks & Benefits</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Staff meals, EPF/SOCSO, OT allowance, medical"
                value={perks}
                onChangeText={setPerks}
              />

              {/* Modal Action Buttons */}
              <View style={s.modalBtnRow}>
                <Pressable
                  style={[s.modalBtn, s.cancelBtn]}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[s.modalBtn, s.saveBtn]}
                  onPress={handleSaveJob}
                >
                  <Text style={s.saveBtnText}>
                    {editingJobId ? "Save Changes" : "Publish Vacancy"}
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