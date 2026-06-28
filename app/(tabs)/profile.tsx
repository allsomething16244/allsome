import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

interface Profile {
  email: string;
  nickname: string;
  gender: 'M' | 'F' | null;
  birth_year: number | null;
  company_id: number | null;
  bio: string | null;
}

interface Company {
  name: string;
}

const GENDER_LABEL: Record<string, string> = { M: '남성', F: '여성' };

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const { editBio } = useLocalSearchParams<{ editBio?: string }>();
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [bioSaving, setBioSaving] = useState(false);
  const bioInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('email, nickname, gender, birth_year, company_id, bio')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setBioText(data.bio ?? '');

        if (data.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('name')
            .eq('id', data.company_id)
            .single();
          setCompany(companyData);
        }
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    if (!loading && editBio === '1') {
      handleBioEdit();
    }
  }, [loading, editBio]);

  const handleBioEdit = () => {
    setEditingBio(true);
    setTimeout(() => bioInputRef.current?.focus(), 50);
  };

  const handleBioSave = async () => {
    setBioSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ bio: bioText.trim() || null })
        .eq('id', user.id);
      setProfile(prev => prev ? { ...prev, bio: bioText.trim() || null } : prev);
    }
    setBioSaving(false);
    setEditingBio(false);
  };

  const handleBioCancel = () => {
    setBioText(profile?.bio ?? '');
    setEditingBio(false);
  };

  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* 아바타 */}
      <View style={styles.avatarCircle}>
        <Ionicons
          name={profile?.gender === 'F' ? 'woman' : 'man'}
          size={52}
          color={profile?.gender === 'F' ? Colors.primary : '#4A90E2'}
        />
      </View>

      <Text style={styles.nickname}>{profile?.nickname}</Text>
      <Text style={styles.email}>{profile?.email}</Text>

      {/* 정보 카드 */}
      <View style={styles.card}>
        <InfoRow label="회사" value={company?.name ?? '-'} />
        <InfoRow label="성별" value={profile?.gender ? GENDER_LABEL[profile.gender] : '-'} />
        <InfoRow label="출생연도" value={profile?.birth_year ? `${profile.birth_year}년` : '-'} last />
      </View>

      {/* 자기소개 */}
      <View style={styles.bioCard}>
        <View style={styles.bioHeader}>
          <Text style={styles.bioTitle}>자기소개</Text>
          {!editingBio && (
            <TouchableOpacity onPress={handleBioEdit}>
              <Text style={styles.bioEditButton}>편집</Text>
            </TouchableOpacity>
          )}
        </View>

        {editingBio ? (
          <>
            <TextInput
              ref={bioInputRef}
              style={styles.bioInput}
              value={bioText}
              onChangeText={setBioText}
              placeholder="자신을 소개해보세요"
              placeholderTextColor={Colors.textSecondary}
              multiline
              maxLength={200}
            />
            <Text style={styles.bioCount}>{bioText.length}/200</Text>
            <View style={styles.bioActions}>
              <TouchableOpacity style={styles.bioCancelButton} onPress={handleBioCancel}>
                <Text style={styles.bioCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bioSaveButton} onPress={handleBioSave} disabled={bioSaving}>
                <Text style={styles.bioSaveText}>{bioSaving ? '저장 중...' : '저장'}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity onPress={handleBioEdit} activeOpacity={0.7}>
            <Text style={profile?.bio ? styles.bioText : styles.bioPlaceholder}>
              {profile?.bio ?? '자신을 소개해보세요'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  nickname: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: Colors.surface,
    marginBottom: 32,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  bioCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: Colors.surface,
    padding: 20,
    marginBottom: 32,
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bioTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  bioEditButton: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  bioText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  bioPlaceholder: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bioInput: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: Colors.background,
  },
  bioCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 6,
  },
  bioActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  bioCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bioCancelText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  bioSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  bioSaveText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  logoutButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '500',
  },
});
