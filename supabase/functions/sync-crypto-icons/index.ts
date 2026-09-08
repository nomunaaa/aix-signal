import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COINGECKO_IDS_MAP: Record<string, string> = {
  'BTCUSDT': 'bitcoin',
  'ETHUSDT': 'ethereum',
  'SOLUSDT': 'solana',
  'BNBUSDT': 'binancecoin',
  'XRPUSDT': 'ripple',
  'ADAUSDT': 'cardano',
  'DOGEUSDT': 'dogecoin',
  'DOTUSDT': 'polkadot',
  'MATICUSDT': 'matic-network',
  'LTCUSDT': 'litecoin',
  'AVAXUSDT': 'avalanche-2',
  'LINKUSDT': 'chainlink',
  'ATOMUSDT': 'cosmos',
  'UNIUSDT': 'uniswap',
  'XLMUSDT': 'stellar',
  'TRXUSDT': 'tron',
  'ETCUSDT': 'ethereum-classic',
  'NEARUSDT': 'near',
  'AAVEUSDT': 'aave',
  'ALGOUSDT': 'algorand',
  'FILUSDT': 'filecoin',
  'VETUSDT': 'vechain',
  'ICPUSDT': 'internet-computer',
  'APTUSDT': 'aptos',
  'LDOUSDT': 'lido-dao',
  'ARBUSDT': 'arbitrum',
  'OPUSDT': 'optimism',
  'INJUSDT': 'injective-protocol',
  'STXUSDT': 'blockstack',
  'SUIUSDT': 'sui',
  'BCHUSDT': 'bitcoin-cash',
  'GALAUSDT': 'gala',
  'POLUSDT': 'polkadot',
  'PYTHUSDT': 'pyth-network',
  'SANDUSDT': 'the-sandbox',
  'SEIUSDT': 'sei-network',
  'TONUSDT': 'the-open-network',
  'ZECUSDT': 'zcash',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { symbols } = await req.json();
    const symbolsToSync = symbols || Object.keys(COINGECKO_IDS_MAP);

    console.log(`🔄 Syncing icons for ${symbolsToSync.length} symbols:`, symbolsToSync);

    // Extract token names (remove USDT suffix) and search CoinGecko by symbol
    const iconsData: any[] = [];
    
    for (const symbol of symbolsToSync) {
      try {
        // First try the mapping
        let coinId = COINGECKO_IDS_MAP[symbol];
        
        // If not in map, extract token name and search by symbol
        if (!coinId) {
          const tokenSymbol = symbol.replace('USDT', '').toLowerCase();
          
          // Search CoinGecko by symbol
          const searchResponse = await fetch(
            `https://api.coingecko.com/api/v3/search?query=${tokenSymbol}`
          );
          
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const coin = searchData.coins?.find((c: any) => 
              c.symbol.toLowerCase() === tokenSymbol
            );
            
            if (coin) {
              coinId = coin.id;
            }
          }
        }
        
        if (coinId) {
          // Fetch coin details to get image
          const coinResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coinId}`
          );
          
          if (coinResponse.ok) {
            const coinData = await coinResponse.json();
            const iconUrl = coinData.image?.large || coinData.image?.small;
            
            if (iconUrl) {
              console.log(`✅ Found icon for ${symbol}: ${iconUrl}`);
              iconsData.push({
                symbol,
                icon_url: iconUrl,
                coingecko_id: coinId,
              });
            }
          } else {
            console.error(`❌ CoinGecko API error for ${coinId}: ${coinResponse.status}`);
          }
        } else {
          console.warn(`⚠️ No CoinGecko ID found for ${symbol}`);
        }
        
        // Rate limiting - avoid hitting CoinGecko rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`❌ Error fetching icon for ${symbol}:`, error);
        // Continue with next symbol
      }
    }
    
    console.log(`📊 Successfully fetched ${iconsData.length} icons`);
    
    if (iconsData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          synced: 0,
          message: 'No new icons to sync'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert to database
    const { data: upsertData, error } = await supabase
      .from('crypto_icons')
      .upsert(iconsData, { 
        onConflict: 'symbol',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: upsertData?.length || 0,
        icons: upsertData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing crypto icons:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});