import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';

interface Package {
  id: string;
  hearts: number;
  price: number;
  pricePerHeart: number;
  badge?: string;
}

const PACKAGES: Package[] = [
  { id: 'starter', hearts: 3, price: 4000, pricePerHeart: 1333 },
  { id: 'basic', hearts: 10, price: 11000, pricePerHeart: 1100 },
  { id: 'popular', hearts: 30, price: 27000, pricePerHeart: 900, badge: '인기' },
  { id: 'premium', hearts: 70, price: 53000, pricePerHeart: 757, badge: '최대 할인' },
];

function formatPrice(price: number) {
  return price.toLocaleString('ko-KR') + '원';
}

export default function HeartShopScreen() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>('popular');

  useEffect(() => {
    const fetchBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_hearts')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      setBalance(data?.balance ?? 0);
      setLoading(false);
    };
    fetchBalance();
  }, []);

  const handlePurchase = () => {
    Alert.alert('준비 중', '인앱 결제는 곧 오픈 예정이에요.');
  };

  const selectedPkg = PACKAGES.find(p => p.id === selected);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>하트 충전</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        {/* 현재 잔액 */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>현재 하트</Text>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
          ) : (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceHeart}>🤍</Text>
              <Text style={styles.balanceCount}>{balance}</Text>
            </View>
          )}
          <Text style={styles.balanceNote}>채팅 신청·수락 시 각 3개 소모</Text>
        </View>

        {/* 패키지 목록 */}
        <Text style={styles.sectionTitle}>충전 패키지</Text>
        <View style={styles.packageList}>
          {PACKAGES.map(pkg => {
            const isSelected = selected === pkg.id;
            return (
              <TouchableOpacity
                key={pkg.id}
                style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                onPress={() => setSelected(pkg.id)}
                activeOpacity={0.8}
              >
                {pkg.badge && (
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badgeText}>{pkg.badge}</Text>
                  </View>
                )}
                <View style={styles.packageLeft}>
                  <Text style={styles.packageHeart}>🤍</Text>
                  <View>
                    <Text style={[styles.packageCount, isSelected && styles.packageCountSelected]}>
                      {pkg.hearts}개
                    </Text>
                    <Text style={styles.packagePerHeart}>
                      개당 {formatPrice(pkg.pricePerHeart)}
                    </Text>
                  </View>
                </View>
                <View style={styles.packageRight}>
                  <Text style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                    {formatPrice(pkg.price)}
                  </Text>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 안내 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoItem}>• 거절·만료 시 하트 1개 환불</Text>
          <Text style={styles.infoItem}>• 하트는 유효기간 없이 보관</Text>
          <Text style={styles.infoItem}>• 구매한 하트는 환불되지 않아요</Text>
        </View>
      </ScrollView>

      {/* 하단 구매 버튼 */}
      <View style={styles.footer}>
        {selectedPkg && (
          <View style={styles.footerInfo}>
            <Text style={styles.footerHeartsText}>🤍 {selectedPkg.hearts}개</Text>
            <Text style={styles.footerArrow}>→</Text>
            <Text style={styles.footerPriceText}>{formatPrice(selectedPkg.price)}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.purchaseButton, !selected && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={!selected}
        >
          <Text style={styles.purchaseButtonText}>
            {selectedPkg ? `${formatPrice(selectedPkg.price)} 결제하기` : '패키지를 선택해주세요'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },

  inner: { padding: 20, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 20, padding: 24, alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  balanceLabel: { fontSize: 13, color: Colors.primary, fontWeight: '600', letterSpacing: 0.5 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 6 },
  balanceHeart: { fontSize: 32 },
  balanceCount: { fontSize: 48, fontWeight: '800', color: Colors.text },
  balanceNote: { fontSize: 12, color: Colors.textSecondary },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12,
  },

  packageList: { gap: 10, marginBottom: 24 },

  packageCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 16,
    borderWidth: 2, borderColor: Colors.border,
    position: 'relative',
  },
  packageCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  badgeWrap: {
    position: 'absolute', top: -10, left: 16,
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  packageLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packageHeart: { fontSize: 28 },
  packageCount: { fontSize: 18, fontWeight: '700', color: Colors.text },
  packageCountSelected: { color: Colors.primary },
  packagePerHeart: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  packageRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  packagePrice: { fontSize: 16, fontWeight: '700', color: Colors.text },
  packagePriceSelected: { color: Colors.primary },

  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: {
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: Colors.primary,
  },

  infoBox: {
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 16, gap: 6,
  },
  infoItem: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  footer: {
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingTop: 12, backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: Colors.border,
    gap: 10,
  },
  footerInfo: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  footerHeartsText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  footerArrow: { fontSize: 14, color: Colors.textSecondary },
  footerPriceText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  purchaseButton: {
    backgroundColor: Colors.primary, borderRadius: 14,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  purchaseButtonDisabled: { backgroundColor: Colors.border },
  purchaseButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
