const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const {slugify} = require("./slugify");

const OUTPUT_DIR = 'dist';

const TEAMS_FILE_PATH = path.join(__dirname, 'teams.json');

const http_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
    'Cookie': '_adm-gpp=DBAA; tcf2cookie=CQZOooAQZOooAAJAGBENCAFsAP_gAEPgAAwILrNR_G__bWlr-bb3aftkeYxP9_hr7sQxBgbJk24FzLvW_JwXx2E5NAzatqIKmRIAu3TBIQNlHJDURVCgKIgVryDMaEyUoTNKJ6BkiFMRI2NYCFxvm4tjWQCY5vr99lc1mB-N7dr82dzyy6hHn3a5_2S1WJCdIYetDfv8ZBKT-9IEd_x8v4v4_F7pE2-eS1n_pGvp6j9-Yns_dBmx9_bSffzPn__rl_e7X_vf_n37v943H77v____f_-7___wXXaj-N_62vLf8WCvw_bIcxi_7_AH3YhiCA2TRswLmXUt6RgvvsJmSJE0YUwQMiABRuiCQAJSMDCIiKFCERAqXiHYAJghQnaQQ8DJAGYixMCgAJCfFxbGsgEzydT86q77ElsZybXtsrlkk3BHfuVa88kqoTE4UwYKO9bY0CAj1eQp7uiVrRaR-Z3SJgUgBjf_KNTL0uw9xfOerTXi6_zk6Yl--5Lnv-92ids3977Z9f_k7_2_zeutzd_-2bPwAAAA.f_wAD_wAAAAA; pubcv={}; acv=2~7.11.12.35.39.43.46.55.61.62.66.70.83.89.93.108.117.122.124.131.135.136.143.144.147.149.153.159.162.167.171.184.192.196.202.211.218.221.228.230.239.241.253.259.266.272.286.291.310.311.317.322.323.326.327.338.348.350.367.371.385.389.393.394.397.407.413.415.424.429.430.436.440.445.448.449.453.482.486.491.494.495.501.503.505.522.523.540.550.559.560.568.571.574.576.584.585.587.588.590.591.725.733.737.745.780.787.802.803.817.820.821.829.839.853.864.867.874.899.904.922.931.932.938.955.979.981.985.986.1003.1024.1027.1031.1033.1034.1040.1046.1051.1053.1067.1085.1092.1095.1097.1099.1107.1126.1127.1135.1143.1149.1152.1162.1166.1167.1170.1171.1178.1186.1188.1192.1201.1204.1205.1211.1215.1225.1226.1227.1230.1232.1236.1248.1252.1268.1276.1284.1286.1290.1301.1307.1312.1313.1317.1322.1329.1336.1344.1345.1356.1364.1365.1375.1403.1411.1415.1416.1419.1428.1440.1442.1449.1451.1455.1456.1465.1485.1495.1509.1512.1516.1525.1540.1542.1548.1555.1558.1564.1570.1577.1579.1583.1584.1591.1603.1608.1613.1616.1633.1638.1648.1651.1653.1665.1667.1669.1671.1677.1678.1682.1697.1699.1703.1s712.1716.1720.1721.1722.1725.1732.1733.1735.1745.1750.1753.1765.1769.1776.1782.1786.1799.1800.1808.1810.1825.1827.1832.1834.1837.1838.1840.1842.1843.1844.1845.1859.1863.1866.1870.1875.1878.1880.1889.1896.1898.1899.1911.1917.1922.1929.1942.1943.1944.1962.1963.1964.1967.1968.1969.1978.1985.1987.1998.2003.2007.2010.2012.2013.2027.2035.2038.2039.2044.2047.2052.2056.2064.2068.2070.2072.2078.2079.2088.2090.2103.2107.2109.2113.2115.2124.2130.2133.2137.2140.2141.2145.2147.2150.2156.2166.2177.2179.2183.2186.2202.2205.2213.2216.2219.2220.2222.2225.2227.2234.2253.2262.2264.2271.2276.2279.2282.2290.2292.2299.2305.2309.2312.2315.2316.2325.2328.2331.2334.2335.2336.2337.2343.2354.2357.2358.2359.2366.2370.2373.2376.2377.2387.2392.2394.2400.2403.2405.2406.2407.2410.2411.2414.2416.2418.2422.2425.2427.2440.2447.2453.2459.2461.2462.2468.2472.2477.2481.2484.2486.2488.2492.2493.2496.2497.2498.2499.2504.2510.2511.2517.2526.22527.2531.2532.2534.2535.2542.2544.2552.2555.2563.2564.2567.2568.2569.2571.2572.2575.2577.2579.2583.2584.2589.2595.2596.2601.2604.2605.2608.2609.2610.2612.2614.2621.2628.2629.2633.2634.2636.2642.2643.2645.2646.2647.2650.2651.2652.2656.2657.2658.2660.2661.2663.2669.2670.2673.2677.2681.2682.2684.2686.2687.2690.2691.2695.2698.2704.2707.2710.2713.2714.2726.2729.2739.2767.2768.2770.2771.2772.2776.2778.2779.2784.2786.2787.2791.2792.2793.2797.2798.2801.2805.2808.2809.2812.2813.2816.2817.2818.2821.2822.2824.2827.2830.2831.2832.2834.2836.2838.2839.2840.2842.2844.2846.2847.2849.2850.2851.2852.2854.2856.2858.2860.2862.2863.2865.2867.2869.2873.2874.2875.2876.2878.2879.2880.2881.2882.2883.2884.2885.2886.2887.2888.2889.2891.2893.2894.2895.2897.2898.2900.2901.2904.2905.2908.2909.2911.2912.2913.2914.2916.2917.2918.2919.2920.2922.2923.2924.2926.2927.2929.2930.2931.2933.2939.2940.2941.2942.2945.2947.2949.2950.2956.2961.2962.2963.2964.2965.2966.2968.2969.2970.2973.2974.2975.2977.2979.2980.2981.2983.2985.2986.2987.2991.2993.2994.2995.2997.3000.3002.3003.3005.3008.3009.3010.3011.3012.3016.3017.3018.3019.3020.3023.3024.3025.3033.3034.3036.3037.3038.3043.3044.3045.3048.3050.3051.3052.3053.3055.3058.3059.3060.3061.3063.3065.3066.3068.3070.3072.3074.3075.3076.3077.3078.3089.3090.3093.3094.3095.3097.3099.3100.3101.3104.3106.3107.3108.3109.3111.3112.3116.3117.3118.3119.3120.3121.3124.3126.3127.3128.3130.3135.3136.3145.3149.3150.3151.3154.3155.3159.3162.3163.3165.3167.3172.3173.3174.3176.3177.3179.3180~dv.; _ga=GA1.1.1393254130.1761655109; JSESSIONID=06CD18E3FCAC12AD617F41EB9BBBF79D; _awl=3.1762244457.5-b3627847b5b6a098e8c442ecbbd7fb3b-6763652d6575726f70652d7765737431-3; AWSALBTG=43QNvZswkNv0xHBUi8fHcD+H9USgBFQjE9yV7od+Cmu+QxAdCzAQFvMHbturc/3+B5pHWqCitI8n96aVNi3l9L7fBOl7Spc75BFj0qQWax5zPSLsGqJ9YHVRcgTrklNHPyPHhjxcaI8I2v6B9LW9F7LmTGpL1opVz+71pE2q5J0Bth089LM=; AWSALB=0wD7gAJ3f5JgvC+lw/TVdYZ0jaA2XjK01NSyT46AYM49ssAQFKl719yn7/r1LSPugdQc4GocIgrX/gi9ZNQuEK9uOGzIAYthugNcy8q/podbfuwXkiHDkgUQE4SZ; _ga_J144WP5M2Q=GS2.1.s1762244197$o4$g1$t1762244714$j60$l0$h0',
    'DNT': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"'
};

/**
 * An async function to fetch a specific team's fixture page and save it.
 * @param {string} team_url - The URL to scrape.
 * @param {string} team_name - The name of the team (e.g., "Railway").
 */
const scrape_team_fixtures = async (team_url, team_name) => {
    if (!team_url || !team_name) {
        console.error('❌ Error: scrape_team_fixtures called with missing url or name.');
        return; // Skip this scrape
    }

    const file_name = `upcoming-fixtures-${slugify(team_name)}.html`;
    const output_path = path.join(__dirname, OUTPUT_DIR, file_name);

    try {
        console.log(`🚀 Starting scrape for: ${team_name} (${team_url})`);

        const response = await axios.get(team_url, {
            headers: http_headers
        });
        const html_content = response.data;

        await fs.mkdir(path.dirname(output_path), { recursive: true });

        await fs.writeFile(output_path, html_content, 'utf8');

        console.log(`✅  Success! HTML for ${team_name} saved to: ${output_path}`);

    } catch (error) {
        console.error(`❌ An error occurred during the scrape for ${team_name}:`);
        if (error.response) {
            console.error(`Error Status: ${error.response.status}`);
        } else if (error.request) {
            console.error(`Error Request: No response received.`);
        } else {
            console.error(`Error Message: ${error.message}`);
        }
    }
};

/**
 * Main function to read teams.json and trigger scrapes for each team.
 */
const main = async () => {
    let teams = [];

    try {
        const file_content = await fs.readFile(TEAMS_FILE_PATH, 'utf8');
        teams = JSON.parse(file_content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ Error: Could not find ${TEAMS_FILE_PATH}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Error: Failed to parse ${TEAMS_FILE_PATH}. Check for JSON syntax errors.`);
        } else {
            console.error(`❌ Error reading teams file: ${error.message}`);
        }
        process.exit(1);
    }

    if (!Array.isArray(teams) || teams.length === 0) {
        console.warn('⚠️ Warning: teams.json is empty or not an array. Nothing to scrape.');
        return;
    }

    console.log(`Found ${teams.length} team(s) to scrape...`);

    for (const team of teams) {
        if (team && team.url && team.name) {
            await scrape_team_fixtures(team.url, team.name);
        } else {
            console.warn('⚠️ Skipping invalid team entry in teams.json:', team);
        }
    }

    console.log('🎉 All scrape operations finished.');
};

main();
