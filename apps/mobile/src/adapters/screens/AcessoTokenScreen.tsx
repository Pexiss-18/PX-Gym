import { useState } from "react";
import { Text } from "react-native";
import { useAuth } from "../hooks/useAuth";
import { Aviso, Botao, Campo, Cartao, Tela, styles as ui } from "./ui";

/**
 * Entrada do personal sem conta: o aluno gera um código e o personal entra
 * com ele. Vale só até expirar (ou até o aluno revogar).
 */
export function AcessoTokenScreen({ onVoltar }: { onVoltar: () => void }) {
  const { entrarComToken } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setErro(null);
    const r = await entrarComToken(codigo);
    if (r.erro) {
      setErro(r.erro);
      setEnviando(false);
    }
  }

  return (
    <Tela titulo="Acesso do personal" subtitulo="Use o código que o aluno te enviou." onVoltar={onVoltar}>
      <Cartao>
        <Campo
          rotulo="Código de acesso"
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="EX.: CARLA-2026"
        />
        {erro ? <Aviso tipo="erro" texto={erro} /> : null}
        <Botao titulo="Acessar" carregando={enviando} desabilitado={!codigo.trim()} onPress={() => void enviar()} />
        <Text style={ui.textoFraco}>
          O acesso é só leitura, avaliação e assinatura dos relatórios desse aluno, e expira sozinho.
        </Text>
      </Cartao>
    </Tela>
  );
}
