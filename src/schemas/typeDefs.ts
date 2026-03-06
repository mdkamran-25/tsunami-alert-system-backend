import gql from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # ========== ENUMS ==========
  enum UserRole {
    ADMIN
    OPERATOR
    VIEWER
  }

  enum AlertStatus {
    SAFE
    WATCH
    WARNING
    ALERT
  }

  enum AlertLevel {
    NONE
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum GPSQuality {
    EXCELLENT
    GOOD
    FAIR
    POOR
  }

  # ========== INPUT TYPES ==========
  input PaginationInput {
    skip: Int
    take: Int
  }

  input GPSReadingFilterInput {
    stationId: String
    minMagnitude: Float
    maxMagnitude: Float
    startTime: DateTime
    endTime: DateTime
  }

  input SatelliteDataFilterInput {
    region: String
    minAnomalyScore: Float
    maxAnomalyScore: Float
    startTime: DateTime
    endTime: DateTime
  }

  input AlertFilterInput {
    status: AlertStatus
    region: String
    startTime: DateTime
    endTime: DateTime
  }

  # ========== AUTH TYPES ==========
  type UserPreferences {
    id: String!
    alertTypes: [String!]!
    regions: [String!]!
    emailNotifications: Boolean!
    smsNotifications: Boolean!
    pushNotifications: Boolean!
  }

  type User {
    id: String!
    email: String!
    name: String
    avatar: String
    role: UserRole!
    isActive: Boolean!
    preferences: UserPreferences
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AuthToken {
    token: String!
    refreshToken: String!
    expiresIn: Int!
    user: User!
  }

  # ========== GPS TYPES ==========
  type GPSStation {
    id: String!
    stationId: String!
    name: String!
    network: String!
    latitude: Float!
    longitude: Float!
    elevation: Float!
    description: String
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type GPSReading {
    id: String!
    stationId: String!
    station: GPSStation!
    latitude: Float!
    longitude: Float!
    elevation: Float!
    displacementX: Float!
    displacementY: Float!
    displacementZ: Float!
    magnitude: Float!
    quality: GPSQuality!
    confidence: Float!
    metadata: JSON
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type GPSReadingConnection {
    edges: [GPSReadingEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type GPSReadingEdge {
    node: GPSReading!
    cursor: String!
  }

  # ========== SATELLITE TYPES ==========
  type SatelliteData {
    id: String!
    imageUrl: String!
    cloudinaryPublicId: String
    region: String!
    regionBounds: JSON!
    regionCenter: JSON!
    anomalyScore: Float!
    anomalyDetected: Boolean!
    metadata: JSON!
    timestamp: DateTime!
    createdAt: DateTime!
  }

  type SatelliteDataConnection {
    edges: [SatelliteDataEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type SatelliteDataEdge {
    node: SatelliteData!
    cursor: String!
  } # ========== ALERT TYPES ==========
  type Alert {
    id: String!
    status: AlertStatus!
    level: AlertLevel!
    message: String!
    region: String!
    gpsTriggered: Boolean!
    satelliteTriggered: Boolean!
    isActive: Boolean!
    createdAt: DateTime!
  }

  # ========== PAGINATION TYPES ==========
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # ========== QUERY TYPES ==========
  type Query {
    # Auth queries
    me: User

    # Alert queries
    currentAlert: Alert!
    alertHistory(filter: AlertFilterInput, pagination: PaginationInput): [Alert!]!

    # GPS queries
    gpsReadings(filter: GPSReadingFilterInput, pagination: PaginationInput): [GPSReading!]!
    gpsStations(isActive: Boolean, pagination: PaginationInput): [GPSStation!]!
    gpsStation(stationId: String!): GPSStation
    gpsReading(id: String!): GPSReading

    # Satellite queries
    satelliteData(filter: SatelliteDataFilterInput, pagination: PaginationInput): [SatelliteData!]!
    latestSatelliteData(region: String): SatelliteData
    satelliteImage(id: String!): SatelliteData
  }

  # ========== MUTATION TYPES ==========
  type Mutation {
    # Authentication
    signup(email: String!, password: String!, name: String!): AuthToken!
    login(email: String!, password: String!): AuthToken!
    refreshToken(refreshToken: String!): AuthToken!
    logout: Boolean!

    # Alert management
    acknowledgeAlert(alertId: String!): Alert!
    resolveAlert(alertId: String!): Alert!
  }

  # ========== SUBSCRIPTION TYPES ==========
  type Subscription {
    alertStatusUpdated: Alert!
    newGPSReading: GPSReading!
    newSatelliteData: SatelliteData!
  }
`;
