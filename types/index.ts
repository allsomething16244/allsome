export interface Company {
  id: number;
  name: string;
  alias: string | null;
  color: string | null;
  enabled: boolean;
  logo_url: string | null;
}

export interface Profile {
  id: string;
  email: string;
  company_id: number | null;
  nickname: string | null;
  bio: string | null;
  profile_image_url: string | null;
  interests: string[] | null;
  birth_year: number | null;
  gender: 'M' | 'F' | 'N' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
