// src/screens/VolunteerApplyScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { Text, View, TextInput } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import PrimaryButton from "../components/PrimaryButton";
import { theme } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import {
  createVolunteerApplication,
  listMyVolunteerApplications,
  uploadFile,
} from "../api/directus";

function prettyStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending") return "Pending";
  if (s === "approved") return "Approved";
  if (s === "rejected") return "Rejected";
  return status || "Unknown";
}

export default function VolunteerApplyScreen({ navigation }) {
  const { me, role, verified } = useAuth();

  const [credentialsText, setCredentialsText] = useState("");
  const [pickedFile, setPickedFile] = useState(null);

  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const roleNorm = useMemo(
    () => String(role || "guest").trim().toLowerCase(),
    [role]
  );

  const verifiedBool = useMemo(
    () => verified === true || verified === "true" || verified === 1,
    [verified]
  );

  async function loadMyApplications() {
    if (!me?.id) return;

    setLoading(true);
    try {
      const items = await listMyVolunteerApplications(me.id);
      setMyApplications(items || []);
    } catch (e) {
      setError(e?.message || "Failed to load volunteer applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  const latestApplication = myApplications?.[0] || null;
  const latestStatus = String(latestApplication?.status || "").toLowerCase();

  const hasBlockingApplication =
    latestStatus === "pending" || latestStatus === "approved";

  async function handlePickFile() {
    try {
      setError(null);

      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: "*/*",
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      setPickedFile(asset);
    } catch (e) {
      setError(e?.message || "Failed to pick file.");
    }
  }

  async function handleSubmit() {
    if (!me?.id) {
      setError("You must be logged in.");
      return;
    }

    if (hasBlockingApplication) {
      setError("You already have an active volunteer application.");
      return;
    }

    if (credentialsText.trim().length < 20) {
      setError("Please provide more details in your application.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let fileId = null;

      if (pickedFile?.uri) {
        const uploaded = await uploadFile({
          uri: pickedFile.uri,
          name: pickedFile.name || "volunteer_document",
          type: pickedFile.mimeType || "application/octet-stream",
        });

        fileId = uploaded?.id || null;
      }

      const payload = {
        credentials_text: credentialsText.trim(),
        status: "pending",
        user: me.id,
      };

      if (fileId) {
        payload.files = [
          {
            directus_files_id: fileId,
          },
        ];
      }

      await createVolunteerApplication(payload);

      setSuccess("Volunteer application submitted.");
      setCredentialsText("");
      setPickedFile(null);
      await loadMyApplications();
    } catch (e) {
      setError(e?.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Header
        title="🫶 Volunteer Application"
        subtitle="Submit credentials for admin review"
        left={<Ionicons name="document-text" size={20} color={theme.colors.primary3} />}
      />

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Chip icon="id-card" text="Identity" />
        <Chip icon="attach" text="Documents" />
        <Chip icon="send" text="Submit" tone="success" />
      </View>

      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          Volunteer verification request
        </Text>

        <Text style={{ color: theme.colors.faint, marginTop: 10 }}>
          Write your application in one message. Include:
        </Text>

        <Text style={{ color: theme.colors.faint, marginTop: 8 }}>• Phone number</Text>
        <Text style={{ color: theme.colors.faint, marginTop: 6 }}>• Area / city</Text>
        <Text style={{ color: theme.colors.faint, marginTop: 6 }}>• Motivation</Text>
        <Text style={{ color: theme.colors.faint, marginTop: 6 }}>• Skills / experience</Text>

        <View style={{ height: theme.spacing(2) }} />

        <TextInput
          value={credentialsText}
          onChangeText={setCredentialsText}
          placeholder="Example: Phone: ... | City: ... | Motivation: ... | Skills: ..."
          placeholderTextColor={theme.colors.muted}
          multiline
          style={{
            minHeight: 140,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 16,
            padding: 12,
            color: theme.colors.text,
            textAlignVertical: "top",
            fontWeight: "700",
          }}
        />

        <View style={{ height: theme.spacing(2) }} />

        <PrimaryButton
          title={pickedFile ? "Change Attachment" : "Attach Document (Optional)"}
          onPress={handlePickFile}
          icon={<Ionicons name="attach" size={18} color="white" />}
        />

        {pickedFile ? (
          <Text style={{ color: theme.colors.success, marginTop: 10, fontWeight: "800" }}>
            Attached: {pickedFile.name || "document"}
          </Text>
        ) : null}

        {error ? (
          <Text style={{ color: theme.colors.danger, marginTop: 12, fontWeight: "900" }}>
            ❌ {error}
          </Text>
        ) : null}

        {success ? (
          <Text style={{ color: theme.colors.success, marginTop: 12, fontWeight: "900" }}>
            ✅ {success}
          </Text>
        ) : null}

        <View style={{ height: theme.spacing(2) }} />

        <PrimaryButton
          title={submitting ? "Submitting..." : "Submit Application"}
          onPress={handleSubmit}
          disabled={submitting || hasBlockingApplication}
          icon={<Ionicons name="paper-plane" size={18} color="white" />}
        />

        <View style={{ height: theme.spacing(2) }} />

        <PrimaryButton
          title="Back"
          onPress={() => navigation.goBack()}
          icon={<Ionicons name="arrow-back" size={18} color="white" />}
        />
      </Card>

      <Card>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          Application status
        </Text>

        {loading ? (
          <Text style={{ color: theme.colors.faint, marginTop: 10 }}>Loading...</Text>
        ) : !latestApplication ? (
          <Text style={{ color: theme.colors.faint, marginTop: 10 }}>
            No application submitted yet.
          </Text>
        ) : (
          <>
            <View style={{ height: theme.spacing(1.5) }} />
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Chip icon="alert-circle" text={`Status: ${prettyStatus(latestApplication.status)}`} />
              <Chip icon="person-circle" text={`Role: ${roleNorm}`} />
              <Chip
                icon={verifiedBool ? "checkmark-circle" : "close-circle"}
                text={verifiedBool ? "Verified: Yes" : "Verified: No"}
                tone={verifiedBool ? "success" : "warn"}
              />
            </View>

            <Text style={{ color: theme.colors.faint, marginTop: 12 }}>
              Submitted text:
            </Text>
            <Text style={{ color: theme.colors.text, marginTop: 6, fontWeight: "700" }}>
              {latestApplication.credentials_text}
            </Text>

            {latestApplication?.files?.length ? (
              <Text style={{ color: theme.colors.success, marginTop: 10, fontWeight: "800" }}>
                Attachment uploaded
              </Text>
            ) : null}

            {latestStatus === "approved" ? (
              <Text style={{ color: theme.colors.success, marginTop: 12, fontWeight: "900" }}>
                Approved by admin. Refresh your profile after the admin changes your role.
              </Text>
            ) : null}

            {latestStatus === "rejected" ? (
              <Text style={{ color: theme.colors.warn, marginTop: 12, fontWeight: "900" }}>
                Rejected. You may update your information and apply again later.
              </Text>
            ) : null}
          </>
        )}
      </Card>
    </Screen>
  );
}