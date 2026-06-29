// 현재 열려있는 채팅방 ID를 모듈 레벨에서 추적
// [id].tsx에서 mount 시 set, unmount 시 clear
let activeRoomId: string | null = null;

export function setActiveRoom(id: string | null) {
  activeRoomId = id;
}

export function getActiveRoom(): string | null {
  return activeRoomId;
}
