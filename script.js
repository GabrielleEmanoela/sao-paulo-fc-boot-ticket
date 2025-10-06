const puppeteer = require('puppeteer');

// Função de delay personalizada
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Cores para o console
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

async function monitorSector() {
    // Configurações
    const url = 'https://cart.spfcticket.net/saopaulofcxcorinthians_25'; // Substitua pela URL real
    const targetSector = 'ARQUIBANCADA LESTE LACTA - Inteira'; // Setor desejado
    const maxAttempts = 999; // Número máximo de tentativas de verificação
    const interval = 5000; // Intervalo entre verificações (30 segundos)

    const browser = await puppeteer.launch({
        headless: false, // Modo com interface gráfica para monitoramento
        // args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`${colors.cyan}Tentativa ${attempt} de ${maxAttempts} - ${new Date().toLocaleString()}${colors.reset}`);

            // Navegar até a página
            await page.goto(url, { waitUntil: 'networkidle2' });
            console.log(`${colors.blue}Página acessada: ${url}${colors.reset}`);

            // Aceitar cookies (se necessário) - com verificação mais robusta
            try {
                const cookieButton = await page.$('.cc-btn.cc-dismiss');
                if (cookieButton) {
                    const isVisible = await cookieButton.isIntersectingViewport();
                    if (isVisible) {
                        await cookieButton.click();
                        console.log(`${colors.yellow}Cookies aceitos${colors.reset}`);
                        await delay(1000); // Pequeno delay após aceitar cookies
                    }
                }
            } catch (cookieError) {
                console.log(`${colors.yellow}Banner de cookies não encontrado ou já foi aceito${colors.reset}`);
            }

            // Esperar pelos itens de produto
            await page.waitForSelector('app-product-item[data-cy="product-item"]', { timeout: 10000 });
            console.log(`${colors.blue}Itens de produto carregados${colors.reset}`);

            // Obter todos os itens de produto
            const products = await page.$$('app-product-item[data-cy="product-item"]');

            let sectorFound = false;

            // Iterar sobre os itens para verificar o setor desejado
            for (const product of products) {
                const sectorName = await product.$eval(
                    'label[data-cy="product-name"]',
                    el => el.textContent.trim()
                );
                const isSoldOut = await product.$('.cart-product-group-item.sold-out');
                const price = await product.$eval(
                    'strong[data-cy="product-price"]',
                    el => el.textContent.trim()
                );

                if (sectorName === targetSector) {
                    sectorFound = true;
                    if (isSoldOut) {
                        console.log(`${colors.red}🔴 Setor ${targetSector} está ESGOTADO. Preço: ${price}${colors.reset}`);
                    } else {
                        console.log(`${colors.green}🟢 Setor ${targetSector} está DISPONÍVEL! Preço: ${price}${colors.reset}`);
                    }
                    break;
                }
            }

            if (!sectorFound) {
                console.log(`${colors.yellow}⚠️  Setor ${targetSector} não encontrado na lista de produtos.${colors.reset}`);
            }

            // Aguardar antes da próxima tentativa
            console.log(`${colors.cyan}Aguardando ${interval / 1000} segundos para a próxima verificação...${colors.reset}`);
            await delay(interval);
        } catch (error) {
            console.error(`${colors.red}Erro na tentativa ${attempt}: ${error.message}${colors.reset}`);
            if (attempt === maxAttempts) {
                console.log(`${colors.red}Máximo de tentativas atingido. Encerrando.${colors.reset}`);
                await browser.close();
                return;
            }
            console.log(`${colors.yellow}Aguardando ${interval / 1000} segundos para tentar novamente...${colors.reset}`);
            await delay(interval);
        }
    }

    await browser.close();
    console.log(`${colors.blue}Navegador fechado.${colors.reset}`);
}

monitorSector();