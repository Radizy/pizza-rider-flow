import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UnitProvider } from "./contexts/UnitContext";
import Index from "./pages/Index";
import Config from "./pages/Config";
import Roteirista from "./pages/Roteirista";
import TV from "./pages/TV";
import Historico from "./pages/Historico";
import MeuLugar from "./pages/MeuLugar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000,
      refetchOnWindowFocus: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UnitProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" theme="dark" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/config" element={<Config />} />
            <Route path="/roteirista" element={<Roteirista />} />
            <Route path="/tv" element={<TV />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/meu-lugar" element={<MeuLugar />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UnitProvider>
  </QueryClientProvider>
);

export default App;
