import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>채팅 화면</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    color: Colors.text,
  },
});
