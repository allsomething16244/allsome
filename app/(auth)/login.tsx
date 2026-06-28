import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  FlatList, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/colors';

interface CompanyOption {
  id: number;
  name: string;
  alias: string | null;
}

interface DomainOption {
  id: number;
  domain: string;
}

export default function LoginScreen() {
  const [companyQuery, setCompanyQuery] = useState('');
  const [results, setResults] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<DomainOption | null>(null);
  const [emailPrefix, setEmailPrefix] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedCompany) return;
    if (!companyQuery.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchCompanies(companyQuery.trim()), 300);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [companyQuery]);

  const searchCompanies = async (query: string) => {
    setSearching(true);
    try {
      const { data } = await supabase
        .from('companies')
        .select('id, name, alias')
        .or(`name.ilike.%${query}%,alias.ilike.%${query}%`)
        .eq('enabled', true)
        .order('ranking', { ascending: true, nullsFirst: false })
        .limit(20);

      setResults(data ?? []);
      setShowDropdown(true);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCompany = async (company: CompanyOption) => {
    const { data } = await supabase
      .from('company_domains')
      .select('id, domain')
      .eq('company_id', company.id);

    if (!data || data.length === 0) {
      Alert.alert('해당 회사의 도메인 정보를 찾을 수 없습니다.');
      return;
    }

    setSelectedCompany(company);
    setDomains(data);
    setSelectedDomain(data.length === 1 ? data[0] : null);
    setCompanyQuery(company.name);
    setShowDropdown(false);
    setResults([]);
  };

  const handleCompanyQueryChange = (text: string) => {
    setCompanyQuery(text);
    if (selectedCompany) {
      setSelectedCompany(null);
      setDomains([]);
      setSelectedDomain(null);
      setEmailPrefix('');
    }
  };

  const handleSendOtp = async () => {
    const prefix = emailPrefix.trim().toLowerCase();
    if (!prefix || !selectedDomain) return;

    setLoading(true);
    try {
      const email = `${prefix}@${selectedDomain!.domain}`;

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email }),
        },
      );

      const result = await res.json();
      if (!res.ok) {
        Alert.alert(result.error ?? '오류가 발생했습니다. 다시 시도해주세요.');
        return;
      }

      router.push({
        pathname: '/(auth)/otp',
        params: { email, company_id: String(selectedCompany.id) },
      });
    } catch {
      Alert.alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!selectedCompany && !!selectedDomain && !!emailPrefix.trim() && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>올썸</Text>
        <Text style={styles.subtitle}>회사 이메일로 시작하세요</Text>

        {/* 회사 검색 */}
        <View style={styles.searchWrapper}>
          <View style={[styles.inputRow, selectedCompany && styles.inputRowSelected]}>
            <TextInput
              style={styles.searchInput}
              placeholder="회사 검색"
              placeholderTextColor={Colors.textSecondary}
              value={companyQuery}
              onChangeText={handleCompanyQueryChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching && (
              <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />
            )}
            {selectedCompany && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedCompany(null);
                  setDomains([]);
                  setSelectedDomain(null);
                  setCompanyQuery('');
                  setEmailPrefix('');
                }}
                style={styles.clearButton}
              >
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 드롭다운 */}
          {showDropdown && results.length > 0 && (
            <View style={styles.dropdown}>
              <FlatList
                data={results}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleSelectCompany(item)}
                  >
                    <Text style={styles.dropdownName}>{item.name}</Text>
                    {item.alias && (
                      <Text style={styles.dropdownAlias}>{item.alias}</Text>
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          )}

          {showDropdown && !searching && results.length === 0 && (
            <View style={styles.dropdown}>
              <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
            </View>
          )}
        </View>

        {/* 도메인 선택 (2개 이상일 때만 표시) */}
        {selectedCompany && domains.length > 1 && (
          <View style={styles.domainSelector}>
            {domains.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.domainChip, selectedDomain?.id === d.id && styles.domainChipSelected]}
                onPress={() => setSelectedDomain(d)}
              >
                <Text style={[styles.domainChipText, selectedDomain?.id === d.id && styles.domainChipTextSelected]}>
                  {d.domain}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 이메일 앞부분 입력 */}
        {selectedCompany && selectedDomain && (
          <View style={styles.emailRow}>
            <TextInput
              style={styles.emailPrefixInput}
              placeholder="이메일 앞부분"
              placeholderTextColor={Colors.textSecondary}
              value={emailPrefix}
              onChangeText={setEmailPrefix}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <Text style={styles.atSign}>@</Text>
            <Text style={styles.domainText}>{selectedDomain.domain}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={!canSubmit}
        >
          <Text style={styles.buttonText}>
            {loading ? '확인 중...' : '인증코드 받기'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  searchWrapper: {
    marginBottom: 12,
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
  },
  inputRowSelected: {
    borderColor: Colors.primary,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  spinner: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  clearText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  dropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownName: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  dropdownAlias: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
  },
  domainSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  domainChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  domainChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  domainChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  domainChipTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emailPrefixInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  atSign: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginHorizontal: 4,
  },
  domainText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  button: {
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
