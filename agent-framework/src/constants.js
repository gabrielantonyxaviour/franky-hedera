export const PUBLIC_DIRECTORIES = {
    images: 'public/img/',
    backups: 'backups/',
    sounds: 'public/sounds',
    extensions: 'public/scripts/extensions',
    globalExtensions: 'public/scripts/extensions/third-party',
};

export const SETTINGS_FILE = 'settings.json';


export const FRANKY_TOKEN_ADDRESS="0x834000F1FC470e878b2b20db274fe5ebb963E895"

/**
 * @type {import('./users.js').UserDirectoryList}
 * @readonly
 * @enum {string}
 */
export const USER_DIRECTORY_TEMPLATE = Object.freeze({
    root: '',
    thumbnails: 'thumbnails',
    thumbnailsBg: 'thumbnails/bg',
    thumbnailsAvatar: 'thumbnails/avatar',
    worlds: 'worlds',
    user: 'user',
    avatars: 'User Avatars',
    userImages: 'user/images',
    groups: 'groups',
    groupChats: 'group chats',
    chats: 'chats',
    characters: 'characters',
    backgrounds: 'backgrounds',
    novelAI_Settings: 'NovelAI Settings',
    koboldAI_Settings: 'KoboldAI Settings',
    openAI_Settings: 'OpenAI Settings',
    textGen_Settings: 'TextGen Settings',
    themes: 'themes',
    movingUI: 'movingUI',
    extensions: 'extensions',
    instruct: 'instruct',
    context: 'context',
    quickreplies: 'QuickReplies',
    assets: 'assets',
    comfyWorkflows: 'user/workflows',
    files: 'user/files',
    vectors: 'vectors',
    backups: 'backups',
    sysprompt: 'sysprompt',
});

/**
 * @type {import('./users.js').User}
 * @readonly
 */
export const DEFAULT_USER = Object.freeze({
    handle: 'default-user',
    name: 'User',
    created: Date.now(),
    password: '',
    admin: true,
    enabled: true,
    salt: '',
});

export const UNSAFE_EXTENSIONS = [
    '.php',
    '.exe',
    '.com',
    '.dll',
    '.pif',
    '.application',
    '.gadget',
    '.msi',
    '.jar',
    '.cmd',
    '.bat',
    '.reg',
    '.sh',
    '.py',
    '.js',
    '.jse',
    '.jsp',
    '.pdf',
    '.html',
    '.htm',
    '.hta',
    '.vb',
    '.vbs',
    '.vbe',
    '.cpl',
    '.msc',
    '.scr',
    '.sql',
    '.iso',
    '.img',
    '.dmg',
    '.ps1',
    '.ps1xml',
    '.ps2',
    '.ps2xml',
    '.psc1',
    '.psc2',
    '.msh',
    '.msh1',
    '.msh2',
    '.mshxml',
    '.msh1xml',
    '.msh2xml',
    '.scf',
    '.lnk',
    '.inf',
    '.reg',
    '.doc',
    '.docm',
    '.docx',
    '.dot',
    '.dotm',
    '.dotx',
    '.xls',
    '.xlsm',
    '.xlsx',
    '.xlt',
    '.xltm',
    '.xltx',
    '.xlam',
    '.ppt',
    '.pptm',
    '.pptx',
    '.pot',
    '.potm',
    '.potx',
    '.ppam',
    '.ppsx',
    '.ppsm',
    '.pps',
    '.ppam',
    '.sldx',
    '.sldm',
    '.ws',
];

export const GEMINI_SAFETY = [
    {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'OFF',
    },
    {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'OFF',
    },
    {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'OFF',
    },
    {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'OFF',
    },
    {
        category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
        threshold: 'BLOCK_NONE',
    },
];

export const CHAT_COMPLETION_SOURCES = {
    OPENAI: 'openai',
    WINDOWAI: 'windowai',
    CLAUDE: 'claude',
    SCALE: 'scale',
    OPENROUTER: 'openrouter',
    AI21: 'ai21',
    MAKERSUITE: 'makersuite',
    MISTRALAI: 'mistralai',
    CUSTOM: 'custom',
    COHERE: 'cohere',
    PERPLEXITY: 'perplexity',
    GROQ: 'groq',
    ZEROONEAI: '01ai',
    BLOCKENTROPY: 'blockentropy',
    NANOGPT: 'nanogpt',
    DEEPSEEK: 'deepseek',
};

/**
 * Path to multer file uploads under the data root.
 */
export const UPLOADS_DIRECTORY = '_uploads';

// TODO: this is copied from the client code; there should be a way to de-duplicate it eventually
export const TEXTGEN_TYPES = {
    OOBA: 'ooba',
    MANCER: 'mancer',
    VLLM: 'vllm',
    APHRODITE: 'aphrodite',
    TABBY: 'tabby',
    KOBOLDCPP: 'koboldcpp',
    TOGETHERAI: 'togetherai',
    LLAMACPP: 'llamacpp',
    OLLAMA: 'ollama',
    INFERMATICAI: 'infermaticai',
    DREAMGEN: 'dreamgen',
    OPENROUTER: 'openrouter',
    FEATHERLESS: 'featherless',
    HUGGINGFACE: 'huggingface',
    GENERIC: 'generic',
};

export const INFERMATICAI_KEYS = [
    'model',
    'prompt',
    'max_tokens',
    'temperature',
    'top_p',
    'top_k',
    'repetition_penalty',
    'stream',
    'stop',
    'presence_penalty',
    'frequency_penalty',
    'min_p',
    'seed',
    'ignore_eos',
    'n',
    'best_of',
    'min_tokens',
    'spaces_between_special_tokens',
    'skip_special_tokens',
    'logprobs',
];

export const FEATHERLESS_KEYS = [
    'model',
    'prompt',
    'best_of',
    'echo',
    'frequency_penalty',
    'logit_bias',
    'logprobs',
    'max_tokens',
    'n',
    'presence_penalty',
    'seed',
    'stop',
    'stream',
    'suffix',
    'temperature',
    'top_p',
    'user',

    'use_beam_search',
    'top_k',
    'min_p',
    'repetition_penalty',
    'length_penalty',
    'early_stopping',
    'stop_token_ids',
    'ignore_eos',
    'min_tokens',
    'skip_special_tokens',
    'spaces_between_special_tokens',
    'truncate_prompt_tokens',

    'include_stop_str_in_output',
    'response_format',
    'guided_json',
    'guided_regex',
    'guided_choice',
    'guided_grammar',
    'guided_decoding_backend',
    'guided_whitespace_pattern',
];

// https://dreamgen.com/docs/api#openai-text
export const DREAMGEN_KEYS = [
    'model',
    'prompt',
    'max_tokens',
    'temperature',
    'top_p',
    'top_k',
    'min_p',
    'repetition_penalty',
    'frequency_penalty',
    'presence_penalty',
    'stop',
    'stream',
    'minimum_message_content_tokens',
];

// https://docs.together.ai/reference/completions
export const TOGETHERAI_KEYS = [
    'model',
    'prompt',
    'max_tokens',
    'temperature',
    'top_p',
    'top_k',
    'repetition_penalty',
    'min_p',
    'presence_penalty',
    'frequency_penalty',
    'stream',
    'stop',
];

// https://github.com/jmorganca/ollama/blob/main/docs/api.md#request-with-options
export const OLLAMA_KEYS = [
    'num_predict',
    'num_ctx',
    'num_batch',
    'stop',
    'temperature',
    'repeat_penalty',
    'presence_penalty',
    'frequency_penalty',
    'top_k',
    'top_p',
    'tfs_z',
    'typical_p',
    'seed',
    'repeat_last_n',
    'mirostat',
    'mirostat_tau',
    'mirostat_eta',
    'min_p',
];

// https://platform.openai.com/docs/api-reference/completions
export const OPENAI_KEYS = [
    'model',
    'prompt',
    'stream',
    'temperature',
    'top_p',
    'frequency_penalty',
    'presence_penalty',
    'stop',
    'seed',
    'logit_bias',
    'logprobs',
    'max_tokens',
    'n',
    'best_of',
];

export const AVATAR_WIDTH = 512;
export const AVATAR_HEIGHT = 768;

export const OPENROUTER_HEADERS = {
    'HTTP-Referer': 'https://sillytavern.app',
    'X-Title': 'SillyTavern',
};

export const FEATHERLESS_HEADERS = {
    'HTTP-Referer': 'https://sillytavern.app',
    'X-Title': 'SillyTavern',
};

export const OPENROUTER_KEYS = [
    'max_tokens',
    'temperature',
    'top_k',
    'top_p',
    'presence_penalty',
    'frequency_penalty',
    'repetition_penalty',
    'min_p',
    'top_a',
    'seed',
    'logit_bias',
    'model',
    'stream',
    'prompt',
    'stop',
    'provider',
    'include_reasoning',
];

// https://github.com/vllm-project/vllm/blob/0f8a91401c89ac0a8018def3756829611b57727f/vllm/entrypoints/openai/protocol.py#L220
export const VLLM_KEYS = [
    'model',
    'prompt',
    'best_of',
    'echo',
    'frequency_penalty',
    'logit_bias',
    'logprobs',
    'max_tokens',
    'n',
    'presence_penalty',
    'seed',
    'stop',
    'stream',
    'suffix',
    'temperature',
    'top_p',
    'user',

    'use_beam_search',
    'top_k',
    'min_p',
    'repetition_penalty',
    'length_penalty',
    'early_stopping',
    'stop_token_ids',
    'ignore_eos',
    'min_tokens',
    'skip_special_tokens',
    'spaces_between_special_tokens',
    'truncate_prompt_tokens',

    'include_stop_str_in_output',
    'response_format',
    'guided_json',
    'guided_regex',
    'guided_choice',
    'guided_grammar',
    'guided_decoding_backend',
    'guided_whitespace_pattern',
];

export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};



export const FRANKY_ABI=[{"inputs":[{"internalType":"address","name":"_frankyAgentAccountImplemetation","type":"address"},{"internalType":"address","name":"_frankyToken","type":"address"},{"internalType":"uint32","name":"_protocolFeeInBps","type":"uint32"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"FailedDeployment","type":"error"},{"inputs":[{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"InsufficientBalance","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"agentAddress","type":"address"},{"indexed":true,"internalType":"address","name":"deviceAddress","type":"address"},{"indexed":false,"internalType":"string","name":"avatar","type":"string"},{"indexed":false,"internalType":"string","name":"subname","type":"string"},{"indexed":false,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"indexed":false,"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"indexed":false,"internalType":"string","name":"secrets","type":"string"},{"indexed":false,"internalType":"bool","name":"isPublic","type":"bool"}],"name":"AgentCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"agentAddress","type":"address"},{"indexed":false,"internalType":"bytes32","name":"keyHash","type":"bytes32"}],"name":"ApiKeyRegenerated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"deviceAddress","type":"address"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"string","name":"deviceModel","type":"string"},{"indexed":false,"internalType":"string","name":"ram","type":"string"},{"indexed":false,"internalType":"string","name":"storageCapacity","type":"string"},{"indexed":false,"internalType":"string","name":"cpu","type":"string"},{"indexed":false,"internalType":"string","name":"ngrokLink","type":"string"},{"indexed":false,"internalType":"uint256","name":"hostingFee","type":"uint256"}],"name":"DeviceRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"frankyENSRegistrar","type":"address"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"deviceAddress","type":"address"},{"indexed":true,"internalType":"address","name":"metalUserAddress","type":"address"}],"name":"MetalWalletConfigured","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"agents","outputs":[{"internalType":"address","name":"agentAddress","type":"address"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"string","name":"subname","type":"string"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"internalType":"uint8","name":"status","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"agentsCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"agentsKeyHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"caller","type":"address"},{"internalType":"address","name":"agentAddress","type":"address"}],"name":"allowApiCall","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"checkAvailableCredits","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"metalUserAddress","type":"address"}],"name":"configureMetalWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"subname","type":"string"},{"internalType":"string","name":"avatar","type":"string"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"internalType":"bool","name":"isPublic","type":"bool"}],"name":"createAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"deviceAgents","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"deviceRegistered","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"devices","outputs":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"hostingFee","type":"uint256"},{"internalType":"uint256","name":"agentCount","type":"uint256"},{"internalType":"bool","name":"isRegistered","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"devicesCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"frankyAgentAccountImplemetation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"frankyENSRegistrar","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"frankyToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"getAgent","outputs":[{"components":[{"internalType":"address","name":"agentAddress","type":"address"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"string","name":"subname","type":"string"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"internalType":"uint8","name":"status","type":"uint8"}],"internalType":"struct Franky.Agent","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"deviceAddress","type":"address"}],"name":"getDevice","outputs":[{"components":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"hostingFee","type":"uint256"},{"internalType":"uint256","name":"agentCount","type":"uint256"},{"internalType":"bool","name":"isRegistered","type":"bool"}],"internalType":"struct Franky.Device","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"getKeyHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getRandomBytes32","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"salt","type":"bytes32"}],"name":"getSmartAccountAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_frankyENSRegistrar","type":"address"}],"name":"intialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"deviceAddress","type":"address"}],"name":"isDeviceOwned","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"deviceAddress","type":"address"}],"name":"isDeviceRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"isHostingAgent","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"ownerDevices","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"protocolFeeInBps","outputs":[{"internalType":"uint32","name":"","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_hash","type":"bytes32"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"recoverSigner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"regenerateApiKey","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"uint256","name":"hostingFee","type":"uint256"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"bytes32","name":"verificationHash","type":"bytes32"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"registerDevice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"reownToMetal","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}]