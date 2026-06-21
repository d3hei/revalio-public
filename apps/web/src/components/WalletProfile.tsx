import { useSignPersonalMessage } from "@mysten/dapp-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getWalletProfile, putWalletProfile } from "../api/client.js";
import { WalletAge } from "./WalletAge.js";
import { WatchlistToggleButton } from "./WatchlistToggleButton.js";
import {
  ALLOWED_AVATAR_ACCEPT,
  buildProfileSignMessage,
  isAllowedAvatarFile,
  resolveWalletAvatarUrl,
  isDefaultWalletAvatar,
  walletDisplayName,
} from "../lib/walletProfile.js";

interface Props {
  address: string;
  canEdit: boolean;
}

interface ProfilePayload {
  nickname: string;
  avatar: string | null;
  bio: string;
}

type ProfileSaveStatus =
  | { type: "saving"; text: "Saving profile…" }
  | { type: "error"; text: string };

function normalizeProfileSaveError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/reject|cancel|denied|declined|user refused/i.test(msg)) {
    return "User rejected the request.";
  }
  return msg || "Could not save profile.";
}

function ProfileSaveCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5L10 17.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfileAvatarResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 7L17 17M17 7L7 17"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WalletProfile({ address, canEdit }: Props) {
  const queryClient = useQueryClient();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const { data: profile } = useQuery({
    queryKey: ["profile", address],
    queryFn: () => getWalletProfile(address),
  });

  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [editingNick, setEditingNick] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [profileSaveStatus, setProfileSaveStatus] = useState<ProfileSaveStatus | null>(null);
  const profileSaveStatusTimerRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nickRef = useRef<HTMLInputElement>(null);
  const nickEditWrapRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLInputElement>(null);
  const bioEditWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNickname(profile?.nickname ?? "");
    setAvatarUrl(profile?.avatar ?? null);
    setBio(profile?.bio ?? "");
    setEditingNick(false);
    setEditingBio(false);
    setCopied(false);
    setAvatarError(null);
    setProfileSaveStatus(null);
  }, [address, profile?.nickname, profile?.avatar, profile?.bio]);

  useEffect(() => {
    if (editingNick) nickRef.current?.focus();
  }, [editingNick]);

  useEffect(() => {
    if (editingBio) bioRef.current?.focus();
  }, [editingBio]);

  useEffect(() => {
    if (profileSaveStatusTimerRef.current !== null) {
      window.clearTimeout(profileSaveStatusTimerRef.current);
      profileSaveStatusTimerRef.current = null;
    }
    if (profileSaveStatus?.type !== "error") return;

    profileSaveStatusTimerRef.current = window.setTimeout(() => {
      setProfileSaveStatus(null);
      profileSaveStatusTimerRef.current = null;
    }, 5000);

    return () => {
      if (profileSaveStatusTimerRef.current !== null) {
        window.clearTimeout(profileSaveStatusTimerRef.current);
        profileSaveStatusTimerRef.current = null;
      }
    };
  }, [profileSaveStatus]);

  const saveMutation = useMutation({
    mutationFn: async (next: ProfilePayload) => {
      const timestampMs = Date.now();
      const messageText = buildProfileSignMessage(address, timestampMs);
      const messageBytes = new TextEncoder().encode(messageText);
      const { signature, bytes } = await signPersonalMessage({ message: messageBytes });
      return putWalletProfile(address, {
        nickname: next.nickname.trim() || null,
        avatar: next.avatar,
        bio: next.bio.trim() || null,
        message: bytes,
        signature,
        timestampMs,
      });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["profile", address], saved);
      setProfileSaveStatus(null);
    },
    onError: () => {
      /* surfaced per save scope in persistProfile */
    },
  });

  async function persistProfile(
    next: ProfilePayload,
    scope: "bio" | "nickname" | "avatar" = "avatar",
  ) {
    if (!canEdit) return;
    setProfileSaveStatus({ type: "saving", text: "Saving profile…" });

    try {
      await saveMutation.mutateAsync(next);
    } catch (err) {
      const message = normalizeProfileSaveError(err);
      if (scope === "bio") {
        setBio(profile?.bio ?? "");
      } else if (scope === "nickname") {
        setNickname(profile?.nickname ?? "");
      } else {
        setAvatarUrl(profile?.avatar ?? null);
      }
      setProfileSaveStatus({ type: "error", text: message });
    }
  }

  function currentPayload(overrides?: Partial<ProfilePayload>): ProfilePayload {
    return {
      nickname,
      avatar: avatarUrl,
      bio,
      ...overrides,
    };
  }

  function cancelNicknameEdit() {
    if (saveMutation.isPending) return;
    setNickname(profile?.nickname ?? "");
    setEditingNick(false);
    setProfileSaveStatus(null);
  }

  function saveNickname(value: string) {
    const trimmed = value.trim();
    const saved = (profile?.nickname ?? "").trim();
    if (trimmed === saved) {
      setEditingNick(false);
      setProfileSaveStatus(null);
      return;
    }
    setNickname(trimmed);
    if (!canEdit) {
      setEditingNick(false);
      return;
    }
    void persistProfile(currentPayload({ nickname: trimmed }), "nickname").finally(() => {
      setEditingNick(false);
    });
  }

  function cancelBioEdit() {
    if (saveMutation.isPending) return;
    setBio(profile?.bio ?? "");
    setEditingBio(false);
    setProfileSaveStatus(null);
  }

  function saveBio(value: string) {
    const trimmed = value.trim();
    const saved = (profile?.bio ?? "").trim();
    if (trimmed === saved) {
      setEditingBio(false);
      setProfileSaveStatus(null);
      return;
    }
    setBio(trimmed);
    if (!canEdit) {
      setEditingBio(false);
      return;
    }
    void persistProfile(currentPayload({ bio: trimmed }), "bio").finally(() => {
      setEditingBio(false);
    });
  }

  function onAvatarPick(file: File | undefined) {
    setAvatarError(null);
    setProfileSaveStatus(null);
    if (!file || !canEdit) return;
    if (!isAllowedAvatarFile(file)) {
      setAvatarError("Use PNG, JPEG, or WebP under 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (!dataUrl) return;
      setAvatarUrl(dataUrl);
      void persistProfile(currentPayload({ avatar: dataUrl }), "avatar");
    };
    reader.readAsDataURL(file);
  }

  function resetAvatar() {
    if (!canEdit || saveMutation.isPending || isDefaultWalletAvatar(avatarUrl)) return;
    setAvatarError(null);
    setProfileSaveStatus(null);
    setAvatarUrl(null);
    void persistProfile(currentPayload({ avatar: null }), "avatar");
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  const displayAvatarUrl = resolveWalletAvatarUrl(avatarUrl);
  const defaultAvatar = isDefaultWalletAvatar(avatarUrl);
  const displayName = walletDisplayName(nickname);
  const bioText = bio.trim();
  const isSaving = profileSaveStatus?.type === "saving";

  return (
    <section className="wallet-profile card">
      {canEdit && profileSaveStatus ? (
        <span
          className={`wallet-profile-save-status${profileSaveStatus.type === "error" ? " is-error" : ""}`}
          role={profileSaveStatus.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {profileSaveStatus.text}
        </span>
      ) : null}
      <div className="wallet-profile-body">
        <div className="wallet-avatar-wrap">
          {canEdit && !defaultAvatar ? (
            <button
              type="button"
              className="wallet-avatar-reset"
              onClick={() => resetAvatar()}
              aria-label="Reset avatar"
              title="Reset to default avatar"
              disabled={saveMutation.isPending}
            >
              <ProfileAvatarResetIcon />
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="wallet-avatar"
              onClick={() => fileRef.current?.click()}
              title="Upload avatar"
              aria-label="Upload avatar"
              disabled={saveMutation.isPending}
            >
              <img
                src={displayAvatarUrl}
                alt=""
                className={`wallet-avatar-img${defaultAvatar ? " wallet-avatar-img--default" : ""}`}
              />
              <span className="wallet-avatar-edit">Change</span>
            </button>
          ) : (
            <div className="wallet-avatar wallet-avatar-readonly" aria-hidden>
              <img
                src={displayAvatarUrl}
                alt=""
                className={`wallet-avatar-img${defaultAvatar ? " wallet-avatar-img--default" : ""}`}
              />
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_AVATAR_ACCEPT}
          className="wallet-avatar-input"
          onChange={(e) => {
            onAvatarPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div className="wallet-profile-meta">
          <div className="wallet-nickname-row">
            {canEdit && editingNick ? (
              <div
                ref={nickEditWrapRef}
                className={`wallet-nickname-input-wrap${isSaving ? " is-saving" : ""}`}
              >
                <input
                  ref={nickRef}
                  className="wallet-nickname-input"
                  value={nickname}
                  maxLength={32}
                  placeholder="Enter nickname"
                  disabled={saveMutation.isPending}
                  onChange={(e) => setNickname(e.target.value)}
                  onBlur={(event) => {
                    if (saveMutation.isPending) return;
                    const next = event.relatedTarget as Node | null;
                    if (next && nickEditWrapRef.current?.contains(next)) return;
                    cancelNicknameEdit();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveNickname(nickname);
                    }
                    if (e.key === "Escape") {
                      cancelNicknameEdit();
                    }
                  }}
                />
                <button
                  type="button"
                  className="wallet-field-save"
                  aria-label="Save nickname"
                  title="Save nickname"
                  disabled={saveMutation.isPending}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => saveNickname(nickname)}
                >
                  <ProfileSaveCheck />
                </button>
              </div>
            ) : canEdit ? (
              <button
                type="button"
                className="wallet-nickname wallet-nickname-editable"
                onClick={() => {
                  setProfileSaveStatus(null);
                  setEditingNick(true);
                }}
                title="Edit nickname"
                disabled={saveMutation.isPending}
              >
                {displayName}
              </button>
            ) : (
              <div className="wallet-nickname wallet-nickname-readonly">{displayName}</div>
            )}
            {!canEdit ? <WatchlistToggleButton address={address} /> : null}
          </div>

          <div className="wallet-address-row">
            <code className="wallet-address-full">{address}</code>
            <button
              type="button"
              className={`wallet-copy${copied ? " is-copied" : ""}`}
              onClick={() => void copyAddress()}
              aria-label={copied ? "Copied" : "Copy address"}
              title={copied ? "Copied" : "Copy address"}
            >
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 12.5L10 17.5L19 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect
                    x="9"
                    y="9"
                    width="11"
                    height="11"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M5 15H4.5C3.67 15 3 14.33 3 13.5V4.5C3 3.67 3.67 3 4.5 3H13.5C14.33 3 15 3.67 15 4.5V5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="wallet-bio-row">
            {canEdit && editingBio ? (
              <div
                ref={bioEditWrapRef}
                className={`wallet-bio-input-wrap${isSaving ? " is-saving" : ""}`}
              >
                <input
                  ref={bioRef}
                  type="text"
                  className="wallet-bio-input"
                  value={bio}
                  maxLength={160}
                  placeholder="Tell others about yourself"
                  disabled={saveMutation.isPending}
                  onChange={(e) => setBio(e.target.value)}
                  onBlur={(event) => {
                    if (saveMutation.isPending) return;
                    const next = event.relatedTarget as Node | null;
                    if (next && bioEditWrapRef.current?.contains(next)) return;
                    cancelBioEdit();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveBio(bio);
                    }
                    if (e.key === "Escape") {
                      cancelBioEdit();
                    }
                  }}
                />
                <button
                  type="button"
                  className="wallet-field-save"
                  aria-label="Save bio"
                  title="Save bio"
                  disabled={saveMutation.isPending}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => saveBio(bio)}
                >
                  <ProfileSaveCheck />
                </button>
              </div>
            ) : canEdit && !bioText ? (
              <button
                type="button"
                className="wallet-bio-add"
                onClick={() => {
                  setProfileSaveStatus(null);
                  setEditingBio(true);
                }}
                disabled={saveMutation.isPending}
              >
                Add a bio to introduce yourself
              </button>
            ) : bioText ? (
              canEdit ? (
                <button
                  type="button"
                  className="wallet-bio wallet-bio-editable"
                  onClick={() => {
                    setProfileSaveStatus(null);
                    setEditingBio(true);
                  }}
                  title="Edit bio"
                  disabled={saveMutation.isPending}
                >
                  {bioText}
                </button>
              ) : (
                <p className="wallet-bio wallet-bio-readonly">{bioText}</p>
              )
            ) : null}
          </div>

          {avatarError ? <p className="wallet-profile-hint error">{avatarError}</p> : null}
        </div>
      </div>
      <div className="wallet-profile-footer">
        <WalletAge address={address} />
      </div>
    </section>
  );
}
