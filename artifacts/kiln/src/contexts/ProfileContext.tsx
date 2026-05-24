import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { artists } from "@/data/artists";
import { useAuth } from "@/contexts/AuthContext";

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  bio: string;
  mediums: string[];
  location: string;
  website: string;
  instagram: string;
  avatarUrl: string;
  coverUrl: string;
  isCustom: boolean;
  accountType?: string;
  whyICreate?: string;
  inspirations?: string;
  artistStatement?: string;
  collectorStory?: string;
}

interface ProfileContextType {
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  isLoggedIn: boolean;
  profileLoaded: boolean;
  demoAs: (artistId: string) => void;
  logout: () => void;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  setProfile: () => undefined,
  isLoggedIn: false,
  profileLoaded: false,
  demoAs: () => undefined,
  logout: () => undefined,
});

function readStored(): UserProfile | null {
  try {
    const s = localStorage.getItem("kiln_profile");
    return s ? (JSON.parse(s) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const stored = readStored();
  const [profile, setProfileState] = useState<UserProfile | null>(stored);
  // If we already have a local profile, consider it loaded immediately
  const [profileLoaded, setProfileLoaded] = useState(!!stored);
  const { isAuthenticated, user } = useAuth();
  const dbSynced = useRef(false);

  function setProfile(p: UserProfile | null) {
    setProfileState(p);
    if (p) localStorage.setItem("kiln_profile", JSON.stringify(p));
    else localStorage.removeItem("kiln_profile");
  }

  // Ensure DB profile record exists and auto-populate local profile from it if needed
  useEffect(() => {
    if (!isAuthenticated || !user || dbSynced.current) return;
    dbSynced.current = true;
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((dbProfile: { displayName?: string | null; handle?: string | null; bio?: string | null; medium?: string | null; location?: string | null; website?: string | null; avatarUrl?: string | null; bannerUrl?: string | null } | null) => {
        if (!dbProfile) return;
        setProfileState((prev) => {
          if (prev) return prev; // already have a local profile, keep it
          const name = dbProfile.displayName ?? dbProfile.handle ?? user.id;
          if (!name) return prev;
          const newProfile: UserProfile = {
            id: user.id,
            name,
            handle: dbProfile.handle ?? user.id,
            bio: dbProfile.bio ?? "",
            mediums: dbProfile.medium ? [dbProfile.medium] : [],
            location: dbProfile.location ?? "",
            website: dbProfile.website ?? "",
            instagram: "",
            avatarUrl: dbProfile.avatarUrl ?? (user as { profileImageUrl?: string }).profileImageUrl ?? "",
            coverUrl: dbProfile.bannerUrl ?? "",
            isCustom: true,
          };
          localStorage.setItem("kiln_profile", JSON.stringify(newProfile));
          return newProfile;
        });
      })
      .catch(() => {})
      .finally(() => {
        setProfileLoaded(true);
      });
  }, [isAuthenticated, user]);

  // If not authenticated, profile is definitively "loaded" (there's nothing to load)
  useEffect(() => {
    if (!isAuthenticated) setProfileLoaded(true);
  }, [isAuthenticated]);

  function demoAs(artistId: string) {
    const artist = artists.find((a) => a.id === artistId);
    if (!artist) return;
    setProfile({
      id: artistId,
      name: artist.name,
      handle: artist.id,
      bio: artist.bio.substring(0, 200) + "…",
      mediums: [artist.medium],
      location: artist.location,
      website: artist.website ?? "",
      instagram: artist.instagram ?? "",
      avatarUrl: artist.images[0]?.url ?? "",
      coverUrl: artist.images[1]?.url ?? artist.images[0]?.url ?? "",
      isCustom: false,
    });
  }

  function logout() {
    setProfile(null);
  }

  return (
    <ProfileContext.Provider value={{ profile, setProfile, isLoggedIn: !!profile, profileLoaded, demoAs, logout }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
