import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

// 세션 확인 중 잠깐 보이는 로딩 화면
// _layout.tsx에서 세션 여부에 따라 login 또는 home으로 자동 이동
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
