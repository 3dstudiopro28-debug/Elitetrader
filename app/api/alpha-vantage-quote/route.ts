import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!symbol) {
    return NextResponse.json({ error: 'Símbolo (symbol) é obrigatório' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'Chave da API da Alpha Vantage não configurada no servidor' }, { status: 500 });
  }

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

  try {
    const alphaVantageResponse = await fetch(url);
    if (!alphaVantageResponse.ok) {
      throw new Error(`Falha na API da Alpha Vantage: ${alphaVantageResponse.statusText}`);
    }

    const data = await alphaVantageResponse.json();

    // Importante: A Alpha Vantage tem uma resposta peculiar.
    if (data['Global Quote'] && Object.keys(data['Global Quote']).length > 0) {
      // Reformatar para se parecer com a resposta antiga, para o frontend não precisar de alterações.
      const quote = data['Global Quote'];
      const formattedData = {
        c: parseFloat(quote['05. price']),
        h: parseFloat(quote['03. high']),
        l: parseFloat(quote['04. low']),
        o: parseFloat(quote['02. open']),
        pc: parseFloat(quote['08. previous close']),
        t: new Date(quote['07. latest trading day']).getTime() / 1000,
      };
      return NextResponse.json(formattedData);
    } else if (data['Note']) {
      // Erro de limite de API da Alpha Vantage
      console.warn(`Limite da API Alpha Vantage atingido: ${data['Note']}`);
      return NextResponse.json({ error: 'Limite da API atingido', details: data['Note'] }, { status: 429 });
    } else {
      // Resposta inesperada
      return NextResponse.json({ error: 'Resposta inválida da Alpha Vantage', data }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro ao chamar a API da Alpha Vantage:', error);
    return NextResponse.json({ error: 'Erro interno do servidor ao buscar cotação' }, { status: 500 });
  }
}
