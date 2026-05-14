import { createContext, useContext, useState, ReactNode } from "react";
import { artists } from "@/data/artists";

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
}

interface ProfileContextType {
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  isLoggedIn: boolean;
  demoAs: (artistId: string) => void;
  logout: () => void;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  setProfile: () => undefined,
  isLoggedIn: false,
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
  const [profile, setProfileState] = useState<UserProfile | null>(readStored);

  function setProfile(p: UserProfile | null) {
    setProfileState(p);
    if (p) localStorage.setItem("kiln_profile", JSON.stringify(p));
    else localStorage.removeItem("kiln_profile");
  }

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
    <ProfileContext.Provider value={{ profile, setProfile, isLoggedIn: !!profile, demoAs, logout }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
