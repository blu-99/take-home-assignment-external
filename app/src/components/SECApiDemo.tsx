import { useState } from "react"
import {
  api,
  type CompanyTickerExchange,
  type DocumentMetadata,
  type SearchResult,
  type SearchResponse,
  type SearchCapabilities,
  type HealthResponse,
  type DatabaseStats,
} from "@/lib/api-client"

interface DemoState {
  loading: boolean
  error: string | null
  health?: HealthResponse
  stats?: DatabaseStats
  capabilities?: SearchCapabilities
  companies: CompanyTickerExchange[]
  documents: DocumentMetadata[]
  searchResults: SearchResult[]
  ftsResults?: SearchResponse
  vectorResults?: SearchResponse
  hybridResults?: SearchResponse
  searchExplanation?: Record<string, unknown>
}

export function SECApiDemo() {
  const [state, setState] = useState<DemoState>({
    loading: false,
    error: null,
    companies: [],
    documents: [],
    searchResults: [],
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [companyQuery, setCompanyQuery] = useState("")
  const [tickerQuery, setTickerQuery] = useState("")
  const [searchType, setSearchType] = useState<"fts" | "vector" | "hybrid">(
    "hybrid",
  )
  const [searchLimit, setSearchLimit] = useState(10)
  const [ftsWeight, setFtsWeight] = useState(0.3)
  const [showExplanation, setShowExplanation] = useState(false)

  // Utility wrapper for async calls
  const handleAsync = async (operation: () => Promise<void>) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      await operation()
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "An error occurred",
      }))
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }

  // API actions
  const checkHealth = async () =>
    handleAsync(async () => {
      const health = await api.getHealth()
      setState((prev) => ({ ...prev, health }))
    })

  const getStats = async () =>
    handleAsync(async () => {
      const stats = await api.getStats()
      setState((prev) => ({ ...prev, stats }))
    })

  const getSearchCapabilities = async () =>
    handleAsync(async () => {
      const capabilities = await api.getSearchCapabilities()
      setState((prev) => ({ ...prev, capabilities }))
    })

  const searchCompanies = async () => {
    if (!companyQuery.trim()) return
    await handleAsync(async () => {
      const companies = await api.getCompaniesByName(companyQuery.trim(), 10)
      setState((prev) => ({ ...prev, companies }))
    })
  }

  const searchByTicker = async () => {
    if (!tickerQuery.trim()) return
    await handleAsync(async () => {
      const companies = await api.getCompaniesByTicker(tickerQuery.trim(), 5)
      const documents =
        companies.length > 0
          ? await api.getDocumentsByTicker(tickerQuery.trim(), 2019, 5)
          : []
      setState((prev) => ({ ...prev, companies, documents }))
    })
  }

  // MAIN SEARCH HANDLER
  const performSearch = async () => {
    if (!searchQuery.trim()) return

    await handleAsync(async () => {
      const query = searchQuery.trim()
      console.log("Running search:", searchType, "with query:", query)

      if (searchType === "fts") {
        const ftsResults = await api.searchFTS({ query, limit: searchLimit })
        console.log("FTS Results from API:", ftsResults)
        setState((prev) => ({
          ...prev,
          ftsResults,
          vectorResults: undefined,
          hybridResults: undefined,
          searchExplanation: undefined,
        }))
      } else if (searchType === "vector") {
        const vectorResults = await api.searchVector({
          query,
          limit: searchLimit,
        })
        console.log("Vector Results from API:", vectorResults)
        setState((prev) => ({
          ...prev,
          vectorResults,
          ftsResults: undefined,
          hybridResults: undefined,
          searchExplanation: undefined,
        }))
      } else if (searchType === "hybrid") {
        if (showExplanation) {
          const explanation = await api.searchHybridWithExplanation({
            query,
            limit: searchLimit,
            fts_weight: ftsWeight,
            semantic_weight: 1 - ftsWeight,
          })
          console.log("Hybrid Explanation Results:", explanation)
          setState((prev) => ({
            ...prev,
            searchExplanation: explanation,
            ftsResults: undefined,
            vectorResults: undefined,
            hybridResults: undefined,
          }))
        } else {
          const hybridResults = await api.searchHybrid({
            query,
            limit: searchLimit,
            fts_weight: ftsWeight,
            semantic_weight: 1 - ftsWeight,
          })
          console.log("Hybrid Results from API:", hybridResults)
          setState((prev) => ({
            ...prev,
            hybridResults,
            ftsResults: undefined,
            vectorResults: undefined,
            searchExplanation: undefined,
          }))
        }
      }
    })
  }

  const clearResults = () =>
    setState({
      loading: false,
      error: null,
      companies: [],
      documents: [],
      searchResults: [],
      health: undefined,
      stats: undefined,
      capabilities: undefined,
      ftsResults: undefined,
      vectorResults: undefined,
      hybridResults: undefined,
      searchExplanation: undefined,
    })

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">SEC API Explorer</h1>
        <p className="text-gray-600 mt-1">
          Explore company filings and search with full-text, vector, or hybrid
          methods
        </p>
      </div>

      {state.error && (
        <div className="bg-red-100 border border-red-200 rounded-md p-4 text-red-700">
          {state.error}
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Server Status */}
        <div className="border rounded p-4 bg-white shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Server Status</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={checkHealth}
              disabled={state.loading}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Health
            </button>
            <button
              onClick={getStats}
              disabled={state.loading}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              Stats
            </button>
            <button
              onClick={getSearchCapabilities}
              disabled={state.loading}
              className="px-3 py-1 bg-gray-200 rounded"
            >
              Capabilities
            </button>
          </div>

          {/* Health */}
          {state.health && (
            <div className="text-sm text-gray-700">
              <p>
                <strong>Status:</strong> {state.health.status}
              </p>
              <p>{state.health.message}</p>
            </div>
          )}

          {/* Stats */}
          {state.stats && (
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                <strong>Companies:</strong>{" "}
                {state.stats.company_tickers_exchange}
              </p>
              <p>
                <strong>Documents:</strong> {state.stats.documents}
              </p>
              <p>
                <strong>Sections:</strong> {state.stats.sections}
              </p>
              <p>
                <strong>Chunks:</strong> {state.stats.chunks}
              </p>
              <p>
                <strong>Embeddings:</strong> {state.stats.embeddings}
              </p>
            </div>
          )}

          {/* Capabilities */}
          {state.capabilities && (
            <div className="text-sm text-gray-700 space-y-1">
              <p>
                <strong>FTS:</strong>{" "}
                {state.capabilities.fts_available ? "Yes" : "No"}
              </p>
              <p>
                <strong>Vector:</strong>{" "}
                {state.capabilities.vector_available ? "Yes" : "No"}
              </p>
              <p>
                <strong>Hybrid:</strong>{" "}
                {state.capabilities.hybrid_available ? "Yes" : "No"}
              </p>
              <p>
                <strong>Model:</strong> {state.capabilities.embedding_model}
              </p>
              <p>
                <strong>Vector Dimensions:</strong>{" "}
                {state.capabilities.vector_dimensions}
              </p>
            </div>
          )}
        </div>

        {/* Company Search */}
        <div className="border rounded p-4 bg-white shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Company Search</h2>
          <input
            value={companyQuery}
            onChange={(e) => setCompanyQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full border rounded px-2 py-1"
          />
          <button
            onClick={searchCompanies}
            className="w-full px-3 py-1 bg-blue-600 text-white rounded"
          >
            Search
          </button>

          <input
            value={tickerQuery}
            onChange={(e) => setTickerQuery(e.target.value)}
            placeholder="Search by ticker..."
            className="w-full border rounded px-2 py-1"
          />
          <button
            onClick={searchByTicker}
            className="w-full px-3 py-1 bg-gray-200 rounded"
          >
            Search Ticker
          </button>
        </div>

        {/* Document Search */}
        <div className="border rounded p-4 bg-white shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Document Search</h2>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full border rounded px-2 py-1"
          />
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="hybrid">Hybrid</option>
            <option value="fts">Full-Text</option>
            <option value="vector">Vector</option>
          </select>
          <button
            onClick={performSearch}
            className="w-full px-3 py-1 bg-blue-600 text-white rounded"
          >
            Run Search
          </button>
          <button
            onClick={clearResults}
            className="w-full px-3 py-1 bg-red-100 text-red-700 rounded"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {state.companies.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold">Companies</h3>
            <ul className="space-y-2">
              {state.companies.map((c) => (
                <li
                  key={c.cik}
                  className="border rounded p-2 bg-white shadow-sm"
                >
                  {c.name} ({c.ticker}) • {c.exchange}
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.documents.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold">Documents</h3>
            <ul className="space-y-2">
              {state.documents.map((d) => (
                <li
                  key={d.doc_id}
                  className="border rounded p-2 bg-white shadow-sm"
                >
                  {d.filename} ({d.year}) • {d.total_sections} sections
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* FTS */}
        {state.ftsResults?.results?.length ? (
          <div>
            <h3 className="text-lg font-semibold">Full-Text Search Results</h3>
            <ul className="space-y-2">
              {state.ftsResults.results.map((r) => (
                <li
                  key={r.chunk_id}
                  className="border rounded p-2 bg-white shadow-sm"
                >
                  <div className="font-medium">
                    {r.company_name || "Unknown Company"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {r.section_name} • {r.filename}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {r.chunk_text?.substring(0, 200)}...
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : state.ftsResults ? (
          <p className="text-sm text-gray-500">No full-text results found.</p>
        ) : null}

        {/* Vector */}
        {state.vectorResults?.results?.length ? (
          <div>
            <h3 className="text-lg font-semibold">Vector Search Results</h3>
            <ul className="space-y-2">
              {state.vectorResults.results.map((r) => (
                <li
                  key={r.chunk_id}
                  className="border rounded p-2 bg-white shadow-sm"
                >
                  <div className="font-medium">
                    {r.company_name || "Unknown Company"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {r.section_name} • {r.filename}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {r.chunk_text?.substring(0, 200)}...
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : state.vectorResults ? (
          <p className="text-sm text-gray-500">No vector results found.</p>
        ) : null}

        {/* Hybrid */}
        {state.hybridResults?.results?.length ? (
          <div>
            <h3 className="text-lg font-semibold">Hybrid Search Results</h3>
            <ul className="space-y-2">
              {state.hybridResults.results.map((r) => (
                <li
                  key={r.chunk_id}
                  className="border rounded p-2 bg-white shadow-sm"
                >
                  <div className="font-medium">
                    {r.company_name || "Unknown Company"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {r.section_name} • {r.filename}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {r.chunk_text?.substring(0, 200)}...
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : state.hybridResults ? (
          <p className="text-sm text-gray-500">No hybrid results found.</p>
        ) : null}
      </div>
    </div>
  )
}
