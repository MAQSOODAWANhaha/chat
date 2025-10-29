import { ChatArea } from "@/components/chat/ChatArea";
import { InputArea } from "@/components/input/InputArea";
import { MainLayout } from "@/components/layout/MainLayout";

export function App() {
  return (
    <MainLayout>
      <ChatArea />
      <InputArea />
    </MainLayout>
  );
}

export default App;
