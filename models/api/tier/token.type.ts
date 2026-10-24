export interface AvailableTokenRes {
  availableToken: number
  totalValidToken: number
  totalUsedToken: number
  percentageUsage: number
}


export interface AnalyticTypeTokenRes {
  type: string
  result: TokenUsage
}

export interface TokenUsage {
  availableToken: number
  totalValidToken: number
  totalUsedToken: number
  percentageUsage: number
}


export interface TokenUsageChartPoint {
  date: string
  dateEnd: string
  image: number
  video: number
}

