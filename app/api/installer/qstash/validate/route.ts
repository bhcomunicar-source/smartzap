import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/installer/qstash/validate
 *
 * Valida credenciais do QStash (token + signing key).
 * Usado no step 4 do wizard de instalação.
 */
export async function POST(req: NextRequest) {
  try {
    const { token, signingKey } = await req.json();

    // Validação básica
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token QStash é obrigatório' },
        { status: 400 }
      );
    }

    if (!signingKey || typeof signingKey !== 'string') {
      return NextResponse.json(
        { error: 'Signing Key é obrigatória' },
        { status: 400 }
      );
    }

    // Validar formato do signing key (string longa, sem prefixo específico)
    if (signingKey.length < 40) {
      return NextResponse.json(
        { error: 'Signing Key muito curta' },
        { status: 400 }
      );
    }

    // Validar token fazendo uma requisição de listagem
    // A API do QStash retorna informações do estado da conta
    const qstashRes = await fetch('https://qstash.upstash.io/v2/messages', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!qstashRes.ok) {
      if (qstashRes.status === 401 || qstashRes.status === 403) {
        return NextResponse.json(
          { error: 'Token QStash inválido ou sem permissões' },
          { status: 401 }
        );
      }

      const errorText = await qstashRes.text().catch(() => '');
      return NextResponse.json(
        { error: `Erro ao validar token: ${errorText || qstashRes.statusText}` },
        { status: qstashRes.status }
      );
    }

    // Token válido - QStash não tem endpoint pra validar signing key
    // A signing key só é usada para verificar webhooks, então confiamos no formato
    return NextResponse.json({
      valid: true,
      message: 'Credenciais QStash válidas',
    });

  } catch (error) {
    console.error('[installer/qstash/validate] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno ao validar credenciais' },
      { status: 500 }
    );
  }
}
