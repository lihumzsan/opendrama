/**
 * API 配置类型定义和预设常量
 */
import {
    composeModelKey,
    parseModelKeyStrict,
    type ModelCapabilities,
    type UnifiedModelType,
} from '@/lib/model-config-contract'
import type {
    OpenAICompatMediaTemplate,
    OpenAICompatMediaTemplateSource,
} from '@/lib/openai-compat-media-template'
import {
    CODEX_DEFAULT_IMAGE_MODEL_ID,
    CODEX_DEFAULT_MODEL_ID,
    CODEX_PROVIDER_KEY,
} from '@/lib/providers/codex/constants'

// 统一提供商接口
export interface Provider {
    id: string
    name: string
    baseUrl?: string
    executablePath?: string
    apiKey?: string
    hasApiKey?: boolean
    hidden?: boolean
    apiMode?: 'gemini-sdk' | 'openai-official'
    gatewayRoute?: 'official' | 'openai-compat'
}

export interface LlmCustomPricing {
    inputPerMillion?: number
    outputPerMillion?: number
}

export interface MediaCustomPricing {
    basePrice?: number
    optionPrices?: Record<string, Record<string, number>>
}

// 用户自定义定价 V2（能力参数可定价）
export interface CustomModelPricing {
    llm?: LlmCustomPricing
    image?: MediaCustomPricing
    video?: MediaCustomPricing
}

// 模型接口
export interface CustomModel {
    modelId: string       // 唯一标识符（如 anthropic/claude-sonnet-4.5）
    modelKey: string      // 唯一主键（provider::modelId）
    name: string          // 显示名称
    type: UnifiedModelType
    provider: string
    llmProtocol?: 'responses' | 'chat-completions'
    llmProtocolCheckedAt?: string
    compatMediaTemplate?: OpenAICompatMediaTemplate
    compatMediaTemplateCheckedAt?: string
    compatMediaTemplateSource?: OpenAICompatMediaTemplateSource
    price: number
    priceMin?: number
    priceMax?: number
    priceLabel?: string
    priceInput?: number
    priceOutput?: number
    enabled: boolean
    capabilities?: ModelCapabilities
    customPricing?: CustomModelPricing
}

export interface PricingDisplayItem {
    min: number
    max: number
    label: string
    input?: number
    output?: number
}

export type PricingDisplayMap = Record<string, PricingDisplayItem>

// API 配置响应
export interface ApiConfig {
    models: CustomModel[]
    providers: Provider[]
    workflowConcurrency?: {
        analysis: number
        image: number
        video: number
    }
    pricingDisplay?: PricingDisplayMap
}

type PresetModel = Omit<CustomModel, 'enabled' | 'modelKey' | 'price'>

// 预设模型
export const PRESET_MODELS: PresetModel[] = [
    // 文本模型
    { modelId: CODEX_DEFAULT_MODEL_ID, name: 'Codex GPT-5.5', type: 'llm', provider: CODEX_PROVIDER_KEY },

    // 图像模型
    { modelId: CODEX_DEFAULT_IMAGE_MODEL_ID, name: 'Codex Image', type: 'image', provider: CODEX_PROVIDER_KEY },
    { modelId: 'banana', name: 'Banana Pro', type: 'image', provider: 'fal' },
    { modelId: 'banana-2', name: 'Banana 2', type: 'image', provider: 'fal' },
    { modelId: 'doubao-seedream-4-5-251128', name: 'Seedream 4.5', type: 'image', provider: 'ark' },
    { modelId: 'doubao-seedream-4-0-250828', name: 'Seedream 4.0', type: 'image', provider: 'ark' },
    { modelId: 'doubao-seedream-5-0-260128', name: 'Seedream 5.0 Lite', type: 'image', provider: 'ark' },
    { modelId: 'gemini-3-pro-image-preview', name: 'Banana Pro', type: 'image', provider: 'google' },
    { modelId: 'gemini-3.1-flash-image-preview', name: 'Nano Banana 2', type: 'image', provider: 'google' },
    { modelId: 'gemini-3-pro-image-preview-batch', name: 'Banana Pro (Batch)', type: 'image', provider: 'google' },
    { modelId: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', type: 'image', provider: 'google' },
    { modelId: 'imagen-4.0-generate-001', name: 'Imagen 4', type: 'image', provider: 'google' },
    { modelId: 'imagen-4.0-ultra-generate-001', name: 'Imagen 4 Ultra', type: 'image', provider: 'google' },
    { modelId: 'imagen-4.0-fast-generate-001', name: 'Imagen 4 Fast', type: 'image', provider: 'google' },
    // 视频模型
    { modelId: 'basevideo/ltx23-profiles/goon-first-last-frame-2stage', name: 'ComfyUI · LTX2.3 Goon First/Last Frame', type: 'video', provider: 'comfyui' },
    { modelId: 'basevideo/minimax-h3/h3-i2va', name: 'ComfyUI · MiniMax H3 Image to Video with Audio', type: 'video', provider: 'comfyui' },
    { modelId: 'basevideo/minimax-h3/h3-fl2va', name: 'ComfyUI · MiniMax H3 First/Last Frame with Audio', type: 'video', provider: 'comfyui' },
    // 音频模型
    { modelId: 'baseaudio/单人/LongCat-one', name: 'ComfyUI · LongCat 单人', type: 'audio', provider: 'comfyui' },
    { modelId: 'baseaudio/单人/s2-one', name: 'ComfyUI · S2 单人', type: 'audio', provider: 'comfyui' },
    { modelId: 'baseaudio/多人/LongCat-two', name: 'ComfyUI · LongCat 多人', type: 'audio', provider: 'comfyui' },
    { modelId: 'baseaudio/多人/s2-two', name: 'ComfyUI · S2 多人', type: 'audio', provider: 'comfyui' },
    { modelId: 'baseaudio/三人/s2-three', name: 'ComfyUI · S2 三人', type: 'audio', provider: 'comfyui' },
    { modelId: 'baseaudio/音色/s2-se', name: 'ComfyUI · S2 音色', type: 'audio', provider: 'comfyui' },
    { modelId: 'fal-ai/index-tts-2/text-to-speech', name: 'IndexTTS 2', type: 'audio', provider: 'fal' },
    { modelId: 'qwen3-tts-vd-2026-01-26', name: 'Qwen3 TTS', type: 'audio', provider: 'bailian' },
    // 口型同步模型
    { modelId: 'fal-ai/kling-video/lipsync/audio-to-video', name: 'Kling Lip Sync', type: 'lipsync', provider: 'fal' },
    { modelId: 'vidu-lipsync', name: 'Vidu Lip Sync', type: 'lipsync', provider: 'vidu' },
    { modelId: 'videoretalk', name: 'VideoRetalk Lip Sync', type: 'lipsync', provider: 'bailian' },

]

const PRESET_COMING_SOON_MODEL_KEYS = new Set<string>([])

export function isPresetComingSoonModel(provider: string, modelId: string): boolean {
    return PRESET_COMING_SOON_MODEL_KEYS.has(encodeModelKey(provider, modelId))
}

export function isPresetComingSoonModelKey(modelKey: string): boolean {
    return PRESET_COMING_SOON_MODEL_KEYS.has(modelKey)
}

// 预设提供商（API Key 唯一归属于 provider id）
export const PRESET_PROVIDERS: Omit<Provider, 'apiKey' | 'hasApiKey'>[] = [
    { id: 'ark', name: 'Volcengine Ark' },
    { id: 'google', name: 'Google AI Studio' },
    { id: 'bailian', name: 'Alibaba Bailian' },
    { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
    { id: 'minimax', name: 'MiniMax Hailuo', baseUrl: 'https://api.minimaxi.com/v1' },
    { id: 'vidu', name: 'Vidu' },
    { id: 'fal', name: 'FAL' },
    { id: CODEX_PROVIDER_KEY, name: 'Codex (Local)' },
    { id: 'comfyui', name: 'ComfyUI (Local)', baseUrl: 'http://127.0.0.1:8188' },
]

const ZH_PROVIDER_NAME_MAP: Record<string, string> = {
    ark: '火山引擎 Ark',
    minimax: '海螺 MiniMax',
    vidu: '生数科技 Vidu',
    bailian: '阿里云百炼',
    siliconflow: '硅基流动',
}

ZH_PROVIDER_NAME_MAP.codex = 'Codex 本地'

function isZhLocale(locale?: string): boolean {
    return typeof locale === 'string' && locale.toLowerCase().startsWith('zh')
}

export function resolvePresetProviderName(providerId: string, fallbackName: string, locale?: string): string {
    if (!isZhLocale(locale)) return fallbackName
    return ZH_PROVIDER_NAME_MAP[providerId] ?? fallbackName
}

/**
 * 提取提供商主键（用于多实例场景，如 gemini-compatible:uuid）
 */
export function getProviderKey(providerId?: string): string {
    if (!providerId) return ''
    const colonIndex = providerId.indexOf(':')
    return colonIndex === -1 ? providerId : providerId.slice(0, colonIndex)
}

/**
 * 获取厂商的友好显示名称
 * @param providerId - 厂商ID（如 'ark', 'google'）
 * @returns 友好名称（如 '火山引擎(方舟)', 'Google AI Studio'）
 */
export function getProviderDisplayName(providerId?: string, locale?: string): string {
    if (!providerId) return ''
    const providerKey = getProviderKey(providerId)
    const provider = PRESET_PROVIDERS.find(p => p.id === providerKey)
    if (!provider) return providerId
    return resolvePresetProviderName(provider.id, provider.name, locale)
}

/**
 * 编码模型复合 Key（用于区分同名模型）
 * @param provider - 厂商 ID
 * @param modelId - 模型 ID
 * @returns 复合 Key，格式为 `provider::modelId`（使用双冒号避免与 provider ID 中的冒号冲突）
 */
export function encodeModelKey(provider: string, modelId: string): string {
    return composeModelKey(provider, modelId)
}

/**
 * 解析模型复合 Key
 * @param key - 复合 Key（provider::modelId）
 * @returns 解析后的 { provider, modelId }，如果无法解析返回 null
 */
export function parseModelKey(key: string | undefined | null): { provider: string, modelId: string } | null {
    const parsed = parseModelKeyStrict(key)
    if (!parsed) return null
    return {
        provider: parsed.provider,
        modelId: parsed.modelId,
    }
}

/**
 * 检查一个复合 Key 是否匹配指定的模型
 * @param key - 复合 Key（provider::modelId）
 * @param provider - 目标厂商 ID
 * @param modelId - 目标模型 ID
 * @returns 是否匹配
 */
export function matchesModelKey(key: string | undefined | null, provider: string, modelId: string): boolean {
    const parsed = parseModelKeyStrict(key)
    if (!parsed) return false
    return parsed.provider === provider && parsed.modelId === modelId
}

// 教程步骤接口
export interface TutorialStep {
    text: string           // 步骤描述 (i18n key)
    url?: string           // 可选的链接地址
}

// 厂商教程接口
export interface ProviderTutorial {
    providerId: string
    steps: TutorialStep[]
}

// 厂商开通教程配置
// 注意: text 字段使用 i18n key, 翻译在 apiConfig.tutorials 下
export const PROVIDER_TUTORIALS: ProviderTutorial[] = [
    {
        providerId: 'ark',
        steps: [
            {
                text: 'ark_step1',
                url: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey?apikey=%7B%7D'
            },
            {
                text: 'ark_step2',
                url: 'https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement?LLM=%7B%7D&advancedActiveKey=model'
            }
        ]
    },
    {
        providerId: 'openrouter',
        steps: [
            {
                text: 'openrouter_step1',
                url: 'https://openrouter.ai/settings/keys'
            }
        ]
    },
    {
        providerId: 'fal',
        steps: [
            {
                text: 'fal_step1',
                url: 'https://fal.ai/dashboard/keys'
            }
        ]
    },
    {
        providerId: 'google',
        steps: [
            {
                text: 'google_step1',
                url: 'https://aistudio.google.com/api-keys'
            }
        ]
    },
    {
        providerId: 'minimax',
        steps: [
            {
                text: 'minimax_step1',
                url: 'https://platform.minimaxi.com/user-center/basic-information/interface-key'
            }
        ]
    },
    {
        providerId: 'vidu',
        steps: [
            {
                text: 'vidu_step1',
                url: 'https://platform.vidu.cn/api-keys'
            }
        ]
    },
    {
        providerId: 'gemini-compatible',
        steps: [
            {
                text: 'gemini_compatible_step1'
            }
        ]
    },
    {
        providerId: 'openai-compatible',
        steps: [
            {
                text: 'openai_compatible_step1'
            }
        ]
    },
    {
        providerId: 'bailian',
        steps: [
            {
                text: 'bailian_step1',
                url: 'https://bailian.console.aliyun.com/cn-beijing/?tab=model#/api-key'
            }
        ]
    },
    {
        providerId: 'siliconflow',
        steps: [
            {
                text: 'siliconflow_step1',
                url: 'https://cloud.siliconflow.cn/account/ak'
            }
        ]
    },
]

/**
 * 根据厂商ID获取教程配置
 * @param providerId - 厂商ID
 * @returns 教程配置，如果不存在则返回 undefined
 */
export function getProviderTutorial(providerId: string): ProviderTutorial | undefined {
    const providerKey = getProviderKey(providerId)
    return PROVIDER_TUTORIALS.find(t => t.providerId === providerKey)
}

/**
 * 获取 Google 官方模型列表的克隆副本，provider 替换为指定 ID。
 * 用于 gemini-compatible 新增时自动预设模型。
 * 排除 batch 模型（Google 特有的异步批量处理）。
 */
export function getGoogleCompatiblePresetModels(providerId: string): PresetModel[] {
    return PRESET_MODELS
        .filter((m) => m.provider === 'google' && !m.modelId.endsWith('-batch'))
        .map((m) => ({ ...m, provider: providerId }))
}
