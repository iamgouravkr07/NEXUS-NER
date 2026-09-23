export type Language = "en" | "hi" | "as";

export interface TranslationDict {
  nav: {
    controlTower: string;
    fieldReport: string;
    alerts: string;
    routes: string;
    incidents: string;
    vehicles: string;
    roads: string;
    analytics: string;
    reportProblem: string;
    myReports: string;
    live: string;
    polling: string;
    online: string;
    offlineMode: string;
    gpsLocked: string;
    gpsReady: string;
    searchPlaceholder: string;
    logout: string;
    notifications: string;
    clearNotifications: string;
    noNotifications: string;
    switchTheme: string;
    lightMode: string;
    darkMode: string;
    settings: string;
    operations: string;
    systemOperational: string;
    allServicesRunning: string;
  };

  common: {
    refresh: string;
    refreshing: string;
    filter: string;
    clear: string;
    close: string;
    cancel: string;
    save: string;
    saving: string;
    submit: string;
    submitting: string;
    search: string;
    export: string;
    view: string;
    inspect: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    previous: string;
    loading: string;
    error: string;
    success: string;
    retry: string;
    all: string;
    actions: string;
    status: string;
    severity: string;
    date: string;
    time: string;
    location: string;
    corridor: string;
    coordinates: string;
    riskScore: string;
    confidence: string;
    assigned: string;
    unassigned: string;
    online: string;
    offline: string;
    verified: string;
    unverified: string;
    rejected: string;
    active: string;
    resolved: string;
    critical: string;
    high: string;
    medium: string;
    low: string;
    normal: string;
    details: string;
    showing: string;
    noDataFound: string;
    unit: string;
    speed: string;
    eta: string;
    distance: string;
    duration: string;
    minutes: string;
    hours: string;
    km: string;
    kmh: string;
    total: string;
    incident: string;
    risk: string;
    reported: string;
  };

  dashboard: {
    controlCentralTitle: string;
    dispatchTerminal: string;
    geofencingActive: string;
    citizenReports: string;
    unverifiedReports: string;
    verifiedReports: string;
    rejectedReports: string;
    telemetrySynced: string;
    backendOffline: string;
    autoRefresh: string;
    postgisLive: string;
    criticalDisruptionActive: string;
    incidentStatus: string;
    executeDynamicDetour: string;
    inspectIncident: string;
    causalChainTitle: string;
    interactiveGraph: string;
    roadNode: string;
    riskNode: string;
    alertActiveNode: string;
    vehicleNode: string;
    tripNode: string;
    activeConvoysTitle: string;
    activeConvoysSub: string;
    disruptionsTitle: string;
    disruptionsSub: string;
    criticalAlertsTitle: string;
    criticalAlertsSub: string;
    roadRiskTitle: string;
    roadRiskSub: string;
    fleetPassable: string;
    fleetAttention: string;
    safeAlternative: string;
    mapTitle: string;
    mapSub: string;
    mapFallback: string;
    legendOrigin: string;
    legendDestination: string;
    legendTelemetry: string;
    legendBlocked: string;
    threatTitle: string;
    threatSub: string;
    threatScore: string;
    threatLevelCritical: string;
    threatLevelModerate: string;
    threatLevelLow: string;
    threatExplanation: string;
    weatherTitle: string;
    weatherSub: string;
    temp: string;
    feelsLike: string;
    humidity: string;
    rain: string;
    rainProb: string;
    wind: string;
    pressure: string;
    visibility: string;
    observedAt: string;
    source: string;
    fleetTitle: string;
    fleetSub: string;
    tableColUnit: string;
    tableColStatus: string;
    tableColLocation: string;
    tableColCargo: string;
    tableColPriority: string;
    tableColTrip: string;
    liveTracking: string;
    recentAlertsTitle: string;
    recentAlertsSub: string;
    viewAllAlerts: string;
    noAlerts: string;
  };

  driverCockpit: {
    missionActive: string;
    assignedVehicle: string;
    tripId: string;
    corridor: string;
    cargoManifest: string;
    priority: string;
    missionStatus: string;
    hazardAlert: string;
    corridorRisk: string;
    activeDetour: string;
    viewSafeRoute: string;
    transmitGps: string;
    gpsTransmitting: string;
    gpsStandby: string;
    lastTelemetry: string;
    noActiveMission: string;
    detourRecommended: string;
    detourDescription: string;
    unassignedNotice: string;
    noVehicleAssignedTitle: string;
    noVehicleAssignedDesc: string;
    terminalStandby: string;
    dispatchApproved: string;
    riskScoreLabel: string;
  };

  incidents: {
    title: string;
    subtitle: string;
    nlpButtonOpen: string;
    nlpButtonClose: string;
    nlpTitle: string;
    nlpBadge: string;
    nlpDesc: string;
    nlpPlaceholder: string;
    nlpAnalyzeBtn: string;
    nlpAnalyzing: string;
    nlpClear: string;
    candidateTitle: string;
    candidateBadge: string;
    providerLabel: string;
    typeLabel: string;
    severityLabel: string;
    confidenceLabel: string;
    corridorLabel: string;
    descLabel: string;
    locationRefLabel: string;
    noticeLabel: string;
    acceptCandidateBtn: string;
    creatingBtn: string;
    dismissCandidateBtn: string;
    totalIncidents: string;
    totalIncidentsSub: string;
    criticalHazards: string;
    criticalHazardsSub: string;
    activeBlockages: string;
    activeBlockagesSub: string;
    avgRisk: string;
    avgRiskSub: string;
    searchPlaceholder: string;
    filterSeverity: string;
    filterStatus: string;
    hideTest: string;
    showingCount: string;
    colId: string;
    colIncident: string;
    colCorridor: string;
    colSeverity: string;
    colRisk: string;
    colStatus: string;
    colTime: string;
    colActions: string;
    inspectBtn: string;
    noIncidentsFound: string;
    modalTitle: string;
    modalSubtitle: string;
    tabOverview: string;
    tabCausal: string;
    tabActions: string;
    causalTitle: string;
    causalDesc: string;
    operatorTitle: string;
    operatorDesc: string;
    verifyBtn: string;
    rejectBtn: string;
    resolveBtn: string;
    rerouteBtn: string;
    statusUpdatedSuccess: string;
    permissionDenied: string;
  };

  vehicles: {
    title: string;
    subtitle: string;
    totalVehicles: string;
    totalVehiclesSub: string;
    inTransit: string;
    inTransitSub: string;
    delayed: string;
    delayedSub: string;
    stoppedOffline: string;
    stoppedOfflineSub: string;
    searchPlaceholder: string;
    tabAll: string;
    tabMoving: string;
    tabDelayed: string;
    tabStopped: string;
    tabOffline: string;
    tabIdle: string;
    colVehicle: string;
    colType: string;
    colStatus: string;
    colCargo: string;
    colPriority: string;
    colTrip: string;
    colGps: string;
    colActions: string;
    viewDetails: string;
    noVehiclesFound: string;
    modalTitle: string;
    unitDetails: string;
    cargoDetails: string;
    telemetryDetails: string;
    assignmentDetails: string;
    unassignedTrip: string;
    liveGpsSignal: string;
    lastSeen: string;
    totalUnits: string;
  };

  routes: {
    title: string;
    subtitle: string;
    calculateBtn: string;
    calculatingBtn: string;
    rerouteBtn: string;
    reroutingBtn: string;
    searchTrip: string;
    tripListTitle: string;
    priorityBadge: string;
    cargoBadge: string;
    selectTripPrompt: string;
    noTripsFound: string;
    simulatorTitle: string;
    speedLabel: string;
    startSim: string;
    pauseSim: string;
    resetSim: string;
    simulatingText: string;
    mapTitle: string;
    mapSubActive: string;
    mapSubIdle: string;
    safeDetourActive: string;
    routeBlockedDelayed: string;
    routeCalculated: string;
    offlineBanner: string;
    comparisonTitle: string;
    comparisonSub: string;
    originalBlocked: string;
    detourProposed: string;
    timeDelta: string;
    distanceDelta: string;
    riskDelta: string;
    aiTradeOffTitle: string;
    aiTradeOffSub: string;
    tradeOffText: string;
    riskAvoidance: string;
    resultTitle: string;
    distanceLabel: string;
    etaLabel: string;
    statusLabel: string;
    assignedVehicleLabel: string;
    gisBannerTitle: string;
    gisBannerDesc: string;
    osrmStatus: string;
    corridorSnapping: string;
    aiRiskScoring: string;
    hazardAvoidance: string;
  };

  alerts: {
    title: string;
    subtitle: string;
    totalAlerts: string;
    totalAlertsSub: string;
    criticalAlerts: string;
    criticalAlertsSub: string;
    highMediumAlerts: string;
    highMediumAlertsSub: string;
    activeUnresolved: string;
    activeUnresolvedSub: string;
    searchPlaceholder: string;
    filterSeverityAll: string;
    filterStatusAll: string;
    statusActive: string;
    statusAcknowledged: string;
    statusResolved: string;
    acknowledgeBtn: string;
    resolveBtn: string;
    acknowledgedBadge: string;
    resolvedBadge: string;
    noAlertsFound: string;
    sourcesTitle: string;
    sourcesSub: string;
    sourceWeather: string;
    sourceIncident: string;
    sourceGps: string;
    sourceAiModel: string;
  };

  roads: {
    title: string;
    subtitle: string;
    totalCorridors: string;
    highRiskCorridors: string;
    accessibleCorridors: string;
    avgNetworkRisk: string;
    searchPlaceholder: string;
    colCorridor: string;
    colHighway: string;
    colRegion: string;
    colRiskLevel: string;
    colProbability: string;
    colStatus: string;
    inspectRiskBtn: string;
    noRoadsFound: string;
    statusOpen: string;
    statusRestricted: string;
    statusUnderRepair: string;
    statusBlocked: string;
    modalTitle: string;
    modalSub: string;
    riskScore: string;
    treeShapAttributions: string;
    deterministicFactors: string;
    overrideStatusTitle: string;
    overrideStatusDesc: string;
    saveStatusBtn: string;
    updatingStatus: string;
    aiPowered: string;
    refreshRisk: string;
    engineTitle: string;
    engineDesc: string;
    modelStatus: string;
    operational: string;
    immediateAction: string;
    closelyMonitor: string;
    monitorConditions: string;
    normalOperations: string;
    mapTitle: string;
    mapSub: string;
    highestRiskTitle: string;
    highestRiskSub: string;
    riskScoreRatio: string;
    viewAnalysis: string;
    tableTitle: string;
    tableSub: string;
    segmentsCount: string;
    colHazard: string;
    colConfidence: string;
    aiPrediction: string;
    aiPredictionSub: string;
    aiPredictionDesc: string;
    weatherSignals: string;
    weatherSignalsSub: string;
    weatherSignalsDesc: string;
    roadCondition: string;
    roadConditionSub: string;
    roadConditionDesc: string;
    hazardType: string;
    material: string;
    surface: string;
    notAvailable: string;
    aiRecommendation: string;
    aiRecommendationDesc: string;
    operatorControlTitle: string;
    roleLabel: string;
    operatorControlDesc: string;
  };

  analytics: {
    title: string;
    subtitle: string;
    timeRange: string;
    last24h: string;
    last7d: string;
    last30d: string;
    lastQuarter: string;
    routesCompleted: string;
    routesCompletedSub: string;
    avgEta: string;
    avgEtaSub: string;
    activeVehicles: string;
    activeVehiclesSub: string;
    accessibilityRate: string;
    accessibilityRateSub: string;
    incidentTrendTitle: string;
    incidentTrendSub: string;
    deliveryTrendTitle: string;
    deliveryTrendSub: string;
    regionalTitle: string;
    regionalSub: string;
    riskDistTitle: string;
    riskDistSub: string;
    corridorTableTitle: string;
    corridorTableSub: string;
    insightsTitle: string;
    insight1: string;
    insight2: string;
    insight3: string;
    fleetUtilization: string;
    routeSafety: string;
    incidentResolution: string;
    footerTitle: string;
    footerDesc: string;
    totalMonitoredRoads: string;
    safeLowRisk: string;
  };

  fieldReport: {
    title: string;
    subtitle: string;
    languageLabel: string;
    outboxActiveTitle: string;
    outboxActiveDesc: string;
    pendingOutboxBadge: string;
    syncNowBtn: string;
    syncingBtn: string;
    allSynced: string;
    formTitle: string;
    formSubtitle: string;
    incidentTypeLabel: string;
    selectTypePrompt: string;
    typeLandslide: string;
    typeFlood: string;
    typeRoadBlockage: string;
    typeRoadDamage: string;
    typeWeatherDisruption: string;
    typeOther: string;
    severityLabel: string;
    sevCritical: string;
    sevHigh: string;
    sevMedium: string;
    sevLow: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    locationLabel: string;
    locationNamePlaceholder: string;
    latitudeLabel: string;
    longitudeLabel: string;
    useGpsBtn: string;
    locatingBtn: string;
    nerPresetsLabel: string;
    presetGuwahati: string;
    presetShillong: string;
    presetTezpur: string;
    presetGangtok: string;
    photoLabel: string;
    takePhotoBtn: string;
    photoGalleryBtn: string;
    photoAttachedText: string;
    removePhotoBtn: string;
    submitReportBtn: string;
    submittingBtn: string;
    saveDraftBtn: string;
    savingDraftBtn: string;
    errSelectType: string;
    errInvalidCoords: string;
    errOutsideNer: string;
    draftSavedSuccess: string;
    reportQueuedOffline: string;
    reportSyncingOnline: string;
    reportSyncedSuccess: string;
    reportEnqueuedRetry: string;
    aiAssistantTitle: string;
    aiAssistantSubtitle: string;
    aiInputPlaceholder: string;
    aiExtractBtn: string;
    aiExtractingBtn: string;
    aiApplyDraftBtn: string;
    aiDisclaimer: string;
    aiConfidence: string;
    aiProvider: string;
    recentReportsTitle: string;
    recentReportsSubtitle: string;
    totalReportsCount: string;
    statusVerified: string;
    statusPendingSync: string;
    statusDraft: string;
    noReportsYet: string;
    publicQueueTitle: string;
    publicQueueSub: string;
    verifyPublicBtn: string;
    rejectPublicBtn: string;
    reviewNotesPlaceholder: string;
    aiVerificationTitle: string;
    aiVerificationSub: string;
    verificationPipeline: string;
    processingSubmission: string;
    readyForReport: string;
    imageEvidence: string;
    attachedLocal: string;
    pendingStatus: string;
    locationValidation: string;
    nerValidated: string;
    pendingGps: string;
    verificationDesc: string;
    gpsInfoTitle: string;
    gpsInfoSub: string;
    gpsStatusLabel: string;
    positionAcquired: string;
    readyOnDemand: string;
    accuracyLabel: string;
    lastUpdateLabel: string;
    neverLabel: string;
    emptyPublicQueue: string;
    processingBtn: string;
    advisoryIngestionBadge: string;
    hideAssistant: string;
    showAssistant: string;
    takePhotoSub: string;
    uploadGallerySub: string;
    statusPending: string;
  };

  publicReport: {
    portalBadge: string;
    portalTitle: string;
    portalSubtitle: string;
    guardrailTitle: string;
    guardrailDesc: string;
    hazardCategoryLabel: string;
    impactLevelLabel: string;
    corridorOptionalLabel: string;
    corridorOptionalPlaceholder: string;
    locationLabel: string;
    useGpsBtn: string;
    acquiringGps: string;
    latLabel: string;
    lonLabel: string;
    gpsAccuracy: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    charCount: string;
    submitBtn: string;
    submittingBtn: string;
    successTitle: string;
    refLabel: string;
    reviewNoticeTitle: string;
    reviewNoticeDesc: string;
    categoryLabel: string;
    severityLabel: string;
    coordsLabel: string;
    viewMyReportsBtn: string;
    submitAnotherBtn: string;
  };

  myReports: {
    title: string;
    subtitle: string;
    refreshBtn: string;
    newReportBtn: string;
    statusVerified: string;
    statusRejected: string;
    statusUnverified: string;
    emptyTitle: string;
    emptyDesc: string;
    reportHazardBtn: string;
    reviewerFeedback: string;
    linkedIncident: string;
    activeInRiskEngine: string;
    corridorLabel: string;
    submittedOn: string;
  };

  auth: {
    loginTitle: string;
    loginSubtitle: string;
    registerTitle: string;
    registerSubtitle: string;
    tabLogin: string;
    tabRegister: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    demoRolesLabel: string;
    roleAdmin: string;
    roleOperator: string;
    roleFieldOfficer: string;
    roleDriver: string;
    rolePublic: string;
    loginSubmitBtn: string;
    registerSubmitBtn: string;
    authenticating: string;
    unauthorizedTitle: string;
    unauthorizedDesc: string;
    returnHomeBtn: string;
    signOutBtn: string;
    registering: string;
    platformSubtitle: string;
    footerInfo: string;
    http403Forbidden: string;
    authenticatedAccount: string;
    activeRole: string;
    rbacNotice: string;
    viewRoadRiskBtn: string;
    returnMissionCockpitBtn: string;
    returnFieldReportsBtn: string;
    returnControlTowerBtn: string;
  };

  network: {
    offlineMode: string;
    noInternet: string;
    pendingOutbox: string;
    syncNow: string;
    syncing: string;
    online: string;
    offlineOutboxClear: string;
    autoSyncActive: string;
    mapDegraded: string;
    mapRetry: string;
  };

  modelInfo: {
    title: string;
    subtitle: string;
    versionLabel: string;
    modelTypeLabel: string;
    featuresLabel: string;
    accuracyLabel: string;
    sihDeclarationTitle: string;
    sihDeclarationDesc: string;
    closeBtn: string;
  };

  shap: {
    title: string;
    subtitle: string;
    positiveImpact: string;
    negativeImpact: string;
    baseValue: string;
    modelPrediction: string;
    exactLabel: string;
    narrativeTitle: string;
    closeBtn: string;
    probabilitySpace: string;
    featureAnalysisFor: string;
    baselineSub: string;
    operationalThreshold: string;
    decisionBoundary: string;
    disruptionLikely: string;
    disruptionUnlikely: string;
    methodologyTitle: string;
    methodologyDesc: string;
    noPositiveFactors: string;
    noNegativeFactors: string;
    additiveConsistency: string;
    footerInfo: string;
    factorsCount: string;
  };

  predictiveRisk: {
    cardTitle: string;
    cardSub: string;
    mlModelTitle: string;
    disruptionLikelihood: string;
    thresholdLabel: string;
    explainShapBtn: string;
    modelDetailsBtn: string;
    topFactorsTitle: string;
  };
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    nav: {
      controlTower: "Control Tower",
      fieldReport: "Field Report",
      alerts: "Alerts",
      routes: "Routes",
      incidents: "Incidents",
      vehicles: "Vehicles",
      roads: "Road Risk",
      analytics: "Analytics",
      reportProblem: "Report Hazard",
      myReports: "My Reports",
      live: "Live",
      polling: "Polling",
      online: "Online",
      offlineMode: "Offline Mode",
      gpsLocked: "GPS locked",
      gpsReady: "GPS ready",
      searchPlaceholder: "Search...",
      logout: "Sign Out",
      notifications: "Notifications",
      clearNotifications: "Clear All",
      noNotifications: "No new notifications",
      switchTheme: "Switch Theme",
      lightMode: "Light Mode",
      darkMode: "Dark Mode",
      settings: "Settings",
      operations: "Operations",
      systemOperational: "System Operational",
      allServicesRunning: "All services running",
    },
    common: {
      refresh: "Refresh",
      refreshing: "Refreshing...",
      filter: "Filter",
      clear: "Clear",
      close: "Close",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving...",
      submit: "Submit",
      submitting: "Submitting...",
      search: "Search",
      export: "Export",
      view: "View",
      inspect: "Inspect",
      delete: "Delete",
      edit: "Edit",
      back: "Back",
      next: "Next",
      previous: "Previous",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      retry: "Retry",
      all: "All",
      actions: "Actions",
      status: "Status",
      severity: "Severity",
      date: "Date",
      time: "Time",
      location: "Location",
      corridor: "Corridor",
      coordinates: "Coordinates",
      riskScore: "Risk Score",
      confidence: "Confidence",
      assigned: "Assigned",
      unassigned: "Unassigned",
      online: "Online",
      offline: "Offline",
      verified: "Verified",
      unverified: "Unverified",
      rejected: "Rejected",
      active: "Active",
      resolved: "Resolved",
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low",
      normal: "Normal",
      details: "Details",
      showing: "Showing",
      noDataFound: "No records found",
      unit: "Unit",
      speed: "Speed",
      eta: "ETA",
      distance: "Distance",
      duration: "Duration",
      minutes: "mins",
      hours: "hrs",
      km: "km",
      kmh: "km/h",
      total: "Total",
      incident: "Incident",
      risk: "Risk",
      reported: "Reported",
    },
    dashboard: {
      controlCentralTitle: "NEXUS-NER Control Central",
      dispatchTerminal: "Guwahati Regional Dispatch Terminal",
      geofencingActive: "PostGIS Geofencing Active",
      citizenReports: "Citizen Reports:",
      unverifiedReports: "Unverified",
      verifiedReports: "Verified",
      rejectedReports: "Rejected",
      telemetrySynced: "Telemetry Synchronized",
      backendOffline: "Backend Offline",
      autoRefresh: "Live • 30s auto-refresh",
      postgisLive: "PostGIS Live",
      criticalDisruptionActive: "Critical Disruption Active",
      incidentStatus: "Incident #{id} • Status: {status}",
      executeDynamicDetour: "Execute Dynamic Detour →",
      inspectIncident: "Inspect Incident →",
      causalChainTitle: "Operational Causal Impact Chain",
      interactiveGraph: "Interactive Telemetry Graph",
      roadNode: "Road #{id}",
      riskNode: "Risk: {score}",
      alertActiveNode: "Alert Active",
      vehicleNode: "Unit {number}",
      tripNode: "Trip #{id}",
      activeConvoysTitle: "Active Convoys",
      activeConvoysSub: "Monitored supply fleet",
      disruptionsTitle: "Corridor Disruptions",
      disruptionsSub: "Active hazard alerts",
      criticalAlertsTitle: "Critical Alerts",
      criticalAlertsSub: "Immediate attention required",
      roadRiskTitle: "Road Risk Index",
      roadRiskSub: "Regional corridor average",
      fleetPassable: "Corridors Open & Passable",
      fleetAttention: "Convoys Need Detour Attention",
      safeAlternative: "Safe Detour Active",
      mapTitle: "NEXUS-NER GIS Operational Map",
      mapSub: "Real-time tactical highway telemetry and hazard visualization",
      mapFallback: "Map tiles unavailable — offline mode",
      legendOrigin: "Origin",
      legendDestination: "Destination",
      legendTelemetry: "Vehicle GPS",
      legendBlocked: "Active Hazard",
      threatTitle: "Corridor Threat Assessment",
      threatSub: "Machine Learning & PostGIS Spatial Analysis",
      threatScore: "Threat Score",
      threatLevelCritical: "HIGH RISK — Disruption Probable",
      threatLevelModerate: "MODERATE RISK — Transit with Caution",
      threatLevelLow: "LOW RISK — Corridor Clear",
      threatExplanation: "Random Forest model evaluated against live weather, soil moisture, and active landslide sensors.",
      weatherTitle: "Regional Weather Intelligence",
      weatherSub: "High-resolution telemetry across NER corridors",
      temp: "Temperature",
      feelsLike: "Feels Like",
      humidity: "Humidity",
      rain: "Precipitation",
      rainProb: "Rain Probability",
      wind: "Wind Velocity",
      pressure: "Atmospheric Pressure",
      visibility: "Visibility",
      observedAt: "Observed",
      source: "Source",
      fleetTitle: "Active Fleet Telemetry",
      fleetSub: "Live GPS coordinates, convoy cargo, and transit state",
      tableColUnit: "Unit / Reg No",
      tableColStatus: "Movement Status",
      tableColLocation: "Current Coordinates",
      tableColCargo: "Cargo Manifest",
      tableColPriority: "Priority",
      tableColTrip: "Assigned Trip",
      liveTracking: "Live Tracking",
      recentAlertsTitle: "Recent Critical Alerts",
      recentAlertsSub: "Automated geofence notifications & threat warnings",
      viewAllAlerts: "View All Alerts",
      noAlerts: "No active hazard alerts across the network.",
    },
    driverCockpit: {
      missionActive: "MISSION ACTIVE",
      assignedVehicle: "Assigned Vehicle",
      tripId: "Trip ID",
      corridor: "Assigned Corridor",
      cargoManifest: "Cargo Manifest",
      priority: "Priority",
      missionStatus: "Mission Status",
      hazardAlert: "Critical Corridor Disruption",
      corridorRisk: "Corridor Risk Index",
      activeDetour: "Safe Detour Active",
      viewSafeRoute: "VIEW SAFE ROUTE",
      transmitGps: "Transmit Live GPS",
      gpsTransmitting: "LIVE GPS TRANSMITTING",
      gpsStandby: "Telemetry Standby — Not Transmitting",
      lastTelemetry: "Last Transmitted Telemetry",
      noActiveMission: "No Active Mission Dispatched",
      detourRecommended: "Safe Detour Dispatched by Control Tower",
      detourDescription: "Safe detour route computed avoiding active corridor disruption",
      unassignedNotice: "No fleet transport vehicle is currently assigned to your terminal. Contact Control Central dispatch for vehicle assignment.",
      noVehicleAssignedTitle: "No Active Vehicle Assigned",
      noVehicleAssignedDesc: "Authenticated Driver: {user}. No vehicle currently assigned.",
      terminalStandby: "Terminal Status: Standby / Unassigned",
      dispatchApproved: "Dispatch Approved",
      riskScoreLabel: "Risk Score",
    },
    incidents: {
      title: "Incident Monitoring & Ingestion",
      subtitle: "Review, verify, and escalate corridor accessibility hazards",
      nlpButtonOpen: "AI / NLP Ingestion",
      nlpButtonClose: "Close NLP Assistant",
      nlpTitle: "AI / NLP Incident Ingestion & Extraction",
      nlpBadge: "Advisory Ingestion",
      nlpDesc: "Paste raw citizen dispatches, WhatsApp alerts, or field officer radio notes to extract candidate incident attributes. Candidates are ingested as unverified and require explicit operator verification.",
      nlpPlaceholder: "e.g. Incessant rain triggered a massive landslide on NH-10 near Gangtok. Both lanes are impassable and multiple cargo trucks are stranded.",
      nlpAnalyzeBtn: "Analyze Report with AI",
      nlpAnalyzing: "Analyzing with NLP...",
      nlpClear: "Clear",
      candidateTitle: "Extraction Candidate",
      candidateBadge: "AI-extracted — requires operator verification",
      providerLabel: "Provider",
      typeLabel: "Incident Type",
      severityLabel: "Severity",
      confidenceLabel: "Confidence",
      corridorLabel: "Corridor Reference",
      descLabel: "Description",
      locationRefLabel: "Location Reference",
      noticeLabel: "Notice",
      acceptCandidateBtn: "Accept & Save Candidate Incident",
      creatingBtn: "Creating Candidate...",
      dismissCandidateBtn: "Dismiss",
      totalIncidents: "Total Incidents",
      totalIncidentsSub: "Recorded in database",
      criticalHazards: "Critical Hazards",
      criticalHazardsSub: "Immediate threat to transit",
      activeBlockages: "Active Blockages",
      activeBlockagesSub: "Corridors currently closed",
      avgRisk: "Average Risk Score",
      avgRiskSub: "Across all incidents",
      searchPlaceholder: "Search incidents by title, corridor, or district...",
      filterSeverity: "Filter by Severity",
      filterStatus: "Filter by Status",
      hideTest: "Hide Test Fixtures",
      showingCount: "Showing {count} of {total} incidents",
      colId: "ID",
      colIncident: "Incident",
      colCorridor: "Corridor / Location",
      colSeverity: "Severity",
      colRisk: "Risk Score",
      colStatus: "Status",
      colTime: "Time",
      colActions: "Actions",
      inspectBtn: "Inspect",
      noIncidentsFound: "No matching incidents found.",
      modalTitle: "Incident Inspection",
      modalSubtitle: "Incident #{id} — Operational Telemetry & Causal Impact",
      tabOverview: "Overview & Telemetry",
      tabCausal: "Causal Chain Analysis",
      tabActions: "Operator Actions",
      causalTitle: "Disruption Propagation Chain",
      causalDesc: "Impact visualization from hazard root cause through road, alert, vehicle, and trip layers.",
      operatorTitle: "Operator Verification Controls",
      operatorDesc: "Authorized verification escalates this incident into the risk engine and triggers automated dynamic detours.",
      verifyBtn: "Verify & Activate Incident",
      rejectBtn: "Reject Report (False Alarm)",
      resolveBtn: "Mark Incident Resolved",
      rerouteBtn: "Calculate Dynamic Detour",
      statusUpdatedSuccess: 'Incident #{id} status updated to "{status}".',
      permissionDenied: "Permission denied: ADMIN or CONTROL_OPERATOR role required.",
    },
    vehicles: {
      title: "Fleet Operations & Telemetry",
      subtitle: "Live GPS tracking, vehicle health, and active mission assignments",
      totalVehicles: "Total Fleet Units",
      totalVehiclesSub: "Registered in system",
      inTransit: "In Transit",
      inTransitSub: "Actively moving on route",
      delayed: "Delayed",
      delayedSub: "Impacted by corridor hazards",
      stoppedOffline: "Stopped / Offline",
      stoppedOfflineSub: "Standby or telemetry lost",
      searchPlaceholder: "Search by vehicle number, type, or cargo...",
      tabAll: "All Vehicles",
      tabMoving: "Moving",
      tabDelayed: "Delayed",
      tabStopped: "Stopped",
      tabOffline: "Offline",
      tabIdle: "Idle",
      colVehicle: "Vehicle / Unit",
      colType: "Type",
      colStatus: "Status",
      colCargo: "Cargo Manifest",
      colPriority: "Priority",
      colTrip: "Trip ID",
      colGps: "Live GPS",
      colActions: "Actions",
      viewDetails: "View Details",
      noVehiclesFound: "No vehicles match the selected criteria.",
      modalTitle: "Vehicle Telemetry Inspection",
      unitDetails: "Unit Specification",
      cargoDetails: "Cargo & Priority",
      telemetryDetails: "GPS & Telemetry Status",
      assignmentDetails: "Trip Assignment",
      unassignedTrip: "No active trip assigned",
      liveGpsSignal: "Live Signal Synchronized",
      lastSeen: "Last Seen",
      totalUnits: "Total Units",
    },
    routes: {
      title: "Dynamic Route Planner & Simulator",
      subtitle: "AI-driven perpendicular corridor rerouting and hazard avoidance",
      calculateBtn: "Calculate Route",
      calculatingBtn: "Calculating...",
      rerouteBtn: "Evaluate Dynamic Detour",
      reroutingBtn: "Computing Reroute...",
      searchTrip: "Search trips by origin or destination...",
      tripListTitle: "Select Trip Mission",
      priorityBadge: "Priority",
      cargoBadge: "Cargo",
      selectTripPrompt: "Select a trip from the list to visualize or evaluate rerouting.",
      noTripsFound: "No matching trips found.",
      simulatorTitle: "Transit Simulator Cockpit",
      speedLabel: "Simulation Speed",
      startSim: "Start Simulation",
      pauseSim: "Pause Simulation",
      resetSim: "Reset Position",
      simulatingText: "Simulating convoy movement along corridor...",
      mapTitle: "Route GIS Visualization",
      mapSubActive: "Dynamic detour active — comparing blocked corridor against safe alternative",
      mapSubIdle: "Select a trip and calculate route or evaluate dynamic reroute",
      safeDetourActive: "Safe Detour Active",
      routeBlockedDelayed: "Route Blocked — Delayed",
      routeCalculated: "Route Calculated",
      offlineBanner: "Map tiles unavailable — offline mode",
      comparisonTitle: "Dynamic Detour Comparison",
      comparisonSub: "PostGIS perpendicular corridor bypass evaluation",
      originalBlocked: "Original Blocked Corridor",
      detourProposed: "Proposed Safe Detour",
      timeDelta: "Time Variance",
      distanceDelta: "Distance Variance",
      riskDelta: "Risk Reduction",
      aiTradeOffTitle: '"Why This Route?" — AI Trade-Off Analysis',
      aiTradeOffSub: "Decision rationale for automatic detour selection",
      tradeOffText: "The system evaluated alternatives and chose the optimal detour based on minimum disruption probability, road load capacity, and avoidance of active geofenced hazards.",
      riskAvoidance: "Hazard Area Completely Avoided",
      resultTitle: "Route Calculation Result",
      distanceLabel: "Distance",
      etaLabel: "Estimated Time",
      statusLabel: "Status",
      assignedVehicleLabel: "Assigned Vehicle",
      gisBannerTitle: "AI Risk-Aware GIS Rerouting Engine Active",
      gisBannerDesc: "Connected to backend PostGIS spatial database and OSRM routing engine. Computes perpendicular corridor detours around verified hazards.",
      osrmStatus: "OSRM Routing Engine: Online",
      corridorSnapping: "Corridor Snapping: Active",
      aiRiskScoring: "AI Risk Scoring: Real-time",
      hazardAvoidance: "Hazard Avoidance: Enabled",
    },
    alerts: {
      title: "Operational Alerts & Intelligence",
      subtitle: "Live disruption warnings, geofence breaches, and life-cycle triage",
      totalAlerts: "Total Alerts",
      totalAlertsSub: "System wide alerts recorded",
      criticalAlerts: "Critical Alerts",
      criticalAlertsSub: "Immediate action required",
      highMediumAlerts: "High / Medium Alerts",
      highMediumAlertsSub: "Corridor delays & weather warnings",
      activeUnresolved: "Active (Unresolved)",
      activeUnresolvedSub: "Currently open in queue",
      searchPlaceholder: "Search alerts by message, corridor, or location...",
      filterSeverityAll: "All Severities",
      filterStatusAll: "All Statuses",
      statusActive: "Active",
      statusAcknowledged: "Acknowledged",
      statusResolved: "Resolved",
      acknowledgeBtn: "Acknowledge",
      resolveBtn: "Resolve",
      acknowledgedBadge: "Acknowledged",
      resolvedBadge: "Resolved",
      noAlertsFound: "No alerts match the current filter criteria.",
      sourcesTitle: "Intelligence Sources",
      sourcesSub: "Real-time feeds feeding the alert engine",
      sourceWeather: "IMD Weather Radar & Rainfall Feeds",
      sourceIncident: "Field Officer Reports & Citizen Ingestion",
      sourceGps: "Live Vehicle Geofence Monitoring",
      sourceAiModel: "Predictive Road Risk ML Models",
    },
    roads: {
      title: "Road & Corridor Risk",
      subtitle: "PostGIS Corridors & Real-Time Hazard Monitoring",
      totalCorridors: "Total Monitored Corridors",
      highRiskCorridors: "High Risk Corridors",
      accessibleCorridors: "Accessible (Open)",
      avgNetworkRisk: "Average Network Risk",
      searchPlaceholder: "Search by corridor name, highway, or district...",
      colCorridor: "Corridor / Segment",
      colHighway: "Highway",
      colRegion: "Region / State",
      colRiskLevel: "Risk Level",
      colProbability: "Disruption Probability",
      colStatus: "Status",
      inspectRiskBtn: "Inspect Risk",
      noRoadsFound: "No matching road corridors found.",
      statusOpen: "Open",
      statusRestricted: "Restricted",
      statusUnderRepair: "Under Repair",
      statusBlocked: "Blocked",
      modalTitle: "Corridor Risk Analysis",
      modalSub: "AI model evaluation and manual status controls",
      riskScore: "Risk Assessment",
      treeShapAttributions: "TreeSHAP Feature Attributions",
      deterministicFactors: "Deterministic Risk Indicators",
      overrideStatusTitle: "Manual Operator Override",
      overrideStatusDesc: "Override the road corridor operational accessibility status in the GIS routing network.",
      saveStatusBtn: "Update Status",
      updatingStatus: "Updating...",
      aiPowered: "AI Powered",
      refreshRisk: "Refresh Risk",
      engineTitle: "Predictive Accessibility Engine",
      engineDesc: "Risk scores combine terrain characteristics, historical incidents, road condition indicators and disruption signals to estimate potential logistics impact.",
      modelStatus: "Model Status",
      operational: "Operational",
      immediateAction: "Immediate action",
      closelyMonitor: "Closely monitor",
      monitorConditions: "Monitor conditions",
      normalOperations: "Normal operations",
      mapTitle: "Risk Distribution Map",
      mapSub: "Predicted disruption hotspots across NER",
      highestRiskTitle: "Highest Risk Corridor",
      highestRiskSub: "Priority area for operator review",
      riskScoreRatio: "Risk score / 100",
      viewAnalysis: "View Risk Analysis",
      tableTitle: "Road Risk Assessment",
      tableSub: "AI-generated risk scores for monitored road segments",
      segmentsCount: "{count} segments",
      colHazard: "Hazard",
      colConfidence: "AI Confidence",
      aiPrediction: "AI Prediction",
      aiPredictionSub: "Machine learning risk scoring",
      aiPredictionDesc: "Historical landslide and road-condition patterns can be combined with current signals to estimate disruption probability.",
      weatherSignals: "Weather Signals",
      weatherSignalsSub: "Rainfall and environmental conditions",
      weatherSignalsDesc: "Weather conditions can increase the probability of flooding, landslides and road accessibility degradation.",
      roadCondition: "Road Condition",
      roadConditionSub: "Surface and accessibility indicators",
      roadConditionDesc: "Surface quality, smoothness, terrain and historical incidents help identify vulnerable logistics corridors.",
      hazardType: "Hazard Type",
      material: "Material",
      surface: "Surface",
      notAvailable: "Not available",
      aiRecommendation: "AI Recommendation",
      aiRecommendationDesc: "Consider alternate routing and increased monitoring for this corridor when the risk score remains elevated.",
      operatorControlTitle: "Operator Corridor Status Control",
      roleLabel: "Role",
      operatorControlDesc: "Update live corridor operational status to adjust deterministic network risk and recalculate predictive models.",
    },
    analytics: {
      title: "Logistics & Risk Analytics",
      subtitle: "Fleet performance, hazard frequency, and corridor resilience metrics",
      timeRange: "Time Range",
      last24h: "Last 24 Hours",
      last7d: "Last 7 Days",
      last30d: "Last 30 Days",
      lastQuarter: "Last Quarter",
      routesCompleted: "Routes Completed",
      routesCompletedSub: "missions in selected window",
      avgEta: "Average Transit ETA",
      avgEtaSub: "standard corridor duration",
      activeVehicles: "Active Fleet Vehicles",
      activeVehiclesSub: "convoys transmitting",
      accessibilityRate: "Corridor Accessibility",
      accessibilityRateSub: "open transit capacity",
      incidentTrendTitle: "Incidents by Day",
      incidentTrendSub: "Corridor disruption trends across the reporting period",
      deliveryTrendTitle: "Transit Duration Variance (Hours)",
      deliveryTrendSub: "Actual transit duration vs baseline schedule",
      regionalTitle: "Regional Activity Distribution",
      regionalSub: "Active vehicles and incidents by North Eastern state",
      riskDistTitle: "Corridor Risk Distribution",
      riskDistSub: "Current proportion of highways by risk category",
      corridorTableTitle: "High-Priority Highway Corridors",
      corridorTableSub: "Performance and accessibility metrics by major route",
      insightsTitle: "Operational AI Insights",
      insight1: "NH-15 corridor risk remains elevated due to active rainfall in Dhemaji district.",
      insight2: "NH-27 bypass routing has reduced transit delays by an average of 42 minutes.",
      insight3: "Vehicle fleet utilization is currently at 85% capacity with zero unacknowledged critical alerts.",
      fleetUtilization: "Fleet Utilization",
      routeSafety: "Route Safety",
      incidentResolution: "Incident Resolution",
      footerTitle: "Analytics intelligence",
      footerDesc: "Live operational analytics computed from vehicle telemetry, verified incidents, road-risk assessments, route history and regional logistics activity across the North Eastern Region.",
      totalMonitoredRoads: "Total monitored roads",
      safeLowRisk: "Safe / Low Risk",
    },
    fieldReport: {
      title: "Field Report",
      subtitle: "Submit geo-tagged road and incident reports from the field",
      languageLabel: "Language",
      outboxActiveTitle: "Location & Offline Outbox Active",
      outboxActiveDesc: "Reports created in low-network corridors are stored locally in the secure offline SQLite/IDB outbox. They synchronize automatically via POST /sync/batch when connectivity returns.",
      pendingOutboxBadge: "pending in outbox",
      syncNowBtn: "Sync Outbox Now",
      syncingBtn: "Syncing...",
      allSynced: "Outbox clear — all reports synced",
      formTitle: "Incident Details",
      formSubtitle: "Capture real-time road accessibility disruption",
      incidentTypeLabel: "Incident Type",
      selectTypePrompt: "Select incident classification...",
      typeLandslide: "Landslide",
      typeFlood: "Flooding / Waterlogging",
      typeRoadBlockage: "Road Blockage",
      typeRoadDamage: "Road Damage",
      typeWeatherDisruption: "Weather Disruption",
      typeOther: "Other Disruption",
      severityLabel: "Severity Level",
      sevCritical: "Critical",
      sevHigh: "High",
      sevMedium: "Medium",
      sevLow: "Low",
      descriptionLabel: "Field Observations & Details",
      descriptionPlaceholder: "Describe road conditions, affected corridor segment, vehicle passability, or estimated clearance...",
      locationLabel: "Location Name / Landmark",
      locationNamePlaceholder: "e.g. NH-27 near Jorabat, KM 42 marker",
      latitudeLabel: "Latitude",
      longitudeLabel: "Longitude",
      useGpsBtn: "Acquire GPS Fix",
      locatingBtn: "Acquiring...",
      nerPresetsLabel: "NER Calibration Presets",
      presetGuwahati: "Guwahati (NH-27)",
      presetShillong: "Shillong (NH-6)",
      presetTezpur: "Tezpur (NH-15)",
      presetGangtok: "Gangtok (NH-10)",
      photoLabel: "Visual Evidence (Optional)",
      takePhotoBtn: "Capture Photo",
      photoGalleryBtn: "Choose from Gallery",
      photoAttachedText: "Photo captured and stored locally in offline evidence vault",
      removePhotoBtn: "Remove Evidence",
      submitReportBtn: "Submit Field Report",
      submittingBtn: "Submitting...",
      saveDraftBtn: "Save Draft Locally",
      savingDraftBtn: "Saving...",
      errSelectType: "Please select an incident type before submitting.",
      errInvalidCoords: "Please provide valid numeric GPS coordinates.",
      errOutsideNer: "Coordinates are outside the North Eastern Region operational bounds [20-30°N, 88-98°E].",
      draftSavedSuccess: "Draft saved locally to offline storage.",
      reportQueuedOffline: "Offline — report saved in local outbox (PENDING). Will synchronize automatically when network returns.",
      reportSyncingOnline: "Report enqueued. Synchronizing with Control Tower...",
      reportSyncedSuccess: "Report successfully synchronized with Control Tower.",
      reportEnqueuedRetry: "Report enqueued in outbox. Synchronization will retry automatically.",
      aiAssistantTitle: "AI/NLP Incident Extraction Assistant",
      aiAssistantSubtitle: "Parse unstructured reports into structured draft",
      aiInputPlaceholder: "Paste field notes, citizen report, or radio dispatch text (e.g., 'Heavy landslide reported near NH-27 between Guwahati and Tezpur...')...",
      aiExtractBtn: "Extract Incident with AI",
      aiExtractingBtn: "Extracting...",
      aiApplyDraftBtn: "Apply Extracted Draft to Form",
      aiDisclaimer: "AI-extracted candidate — requires field officer verification before submission.",
      aiConfidence: "Confidence",
      aiProvider: "Provider",
      recentReportsTitle: "Recent Field Reports",
      recentReportsSubtitle: "Recently queued and submitted field reports",
      totalReportsCount: "Total",
      statusVerified: "Verified",
      statusPendingSync: "Pending Sync",
      statusDraft: "Local Draft",
      noReportsYet: "No field reports recorded yet.",
      publicQueueTitle: "Citizen Hazard Reports (Review Queue)",
      publicQueueSub: "Public observations awaiting officer verification",
      verifyPublicBtn: "Verify as Incident",
      rejectPublicBtn: "Reject Report",
      reviewNotesPlaceholder: "Optional review notes...",
      aiVerificationTitle: "AI Verification",
      aiVerificationSub: "Automated incident validation",
      verificationPipeline: "Verification Pipeline",
      processingSubmission: "Processing submission...",
      readyForReport: "Ready for field report",
      imageEvidence: "Image evidence",
      attachedLocal: "Attached (Local)",
      pendingStatus: "Pending",
      locationValidation: "Location validation",
      nerValidated: "NER Validated",
      pendingGps: "Pending GPS",
      verificationDesc: "Reports are analyzed with geo-location risk mapping and incident classification before escalating corridor alerts.",
      gpsInfoTitle: "GPS Information",
      gpsInfoSub: "Current device positioning",
      gpsStatusLabel: "Status",
      positionAcquired: "Position Acquired",
      readyOnDemand: "Ready on demand",
      accuracyLabel: "Accuracy",
      lastUpdateLabel: "Last update",
      neverLabel: "Never",
      emptyPublicQueue: "No pending unverified citizen reports in queue. All observations processed.",
      processingBtn: "Processing...",
      advisoryIngestionBadge: "Advisory Ingestion",
      hideAssistant: "Hide Assistant",
      showAssistant: "Show Assistant",
      takePhotoSub: "Take photo on device",
      uploadGallerySub: "Upload local file",
      statusPending: "Pending",
    },
    publicReport: {
      portalBadge: "Citizen Road Observation Portal",
      portalTitle: "Citizen Road Condition Report",
      portalSubtitle: "Help NEXUS-NER keep logistics and emergency transit corridors safe across the North Eastern Region.",
      guardrailTitle: "Verification Guardrail (Initial Status: UNVERIFIED):",
      guardrailDesc: "All citizen reports are received in UNVERIFIED status and reviewed by Field Officers and Control Operators. Submitting a report does not immediately block roads or create official incidents.",
      hazardCategoryLabel: "Hazard / Problem Category",
      impactLevelLabel: "Perceived Impact Level",
      corridorOptionalLabel: "Affected Highway / Corridor (Optional)",
      corridorOptionalPlaceholder: "-- Select corridor or leave unspecified --",
      locationLabel: "Location Coordinates (NER Region)",
      useGpsBtn: "Use Device GPS",
      acquiringGps: "Acquiring...",
      latLabel: "Latitude [20° - 30°N]",
      lonLabel: "Longitude [88° - 98°E]",
      gpsAccuracy: "✓ Acquired from device sensors (accuracy ±{acc}m)",
      descriptionLabel: "Description & Visual Observations",
      descriptionPlaceholder: "Describe what you see: e.g. Mudslide blocking both lanes approx 5km east of bridge. Heavy rain ongoing, vehicles queuing up.",
      charCount: "{count}/2000",
      submitBtn: "Submit Road Problem Report",
      submittingBtn: "Submitting Observation...",
      successTitle: "Report Submitted Successfully",
      refLabel: "Report Reference",
      reviewNoticeTitle: "Status: UNVERIFIED (Under Review)",
      reviewNoticeDesc: "Your observation has been queued for verification by NEXUS-NER field officers and dispatch operators. It will not officially affect convoy routing until verified.",
      categoryLabel: "Category",
      severityLabel: "Perceived Severity",
      coordsLabel: "Coordinates",
      viewMyReportsBtn: "View My Reports",
      submitAnotherBtn: "Submit Another Report",
    },
    myReports: {
      title: "My Submitted Reports",
      subtitle: "Track operational verification and status of your citizen hazard submissions.",
      refreshBtn: "Refresh",
      newReportBtn: "New Report",
      statusVerified: "Verified — Incident Active",
      statusRejected: "Rejected",
      statusUnverified: "UNVERIFIED (Under Review)",
      emptyTitle: "No Submitted Reports Found",
      emptyDesc: "You haven't reported any road hazards or disruptions yet. Notice something on the road?",
      reportHazardBtn: "Report a Road Hazard",
      reviewerFeedback: "Reviewer Feedback",
      linkedIncident: "Linked to Official Incident: #{id}",
      activeInRiskEngine: "Active in Risk Engine",
      corridorLabel: "Corridor",
      submittedOn: "Submitted {date}",
    },
    auth: {
      loginTitle: "Sign In to NEXUS-NER",
      loginSubtitle: "Autonomous Logistics & Emergency Supply Resilience Platform",
      registerTitle: "Create Public Citizen Account",
      registerSubtitle: "Join the community to report road hazards across the North East",
      tabLogin: "Sign In",
      tabRegister: "Register",
      usernameLabel: "Username",
      usernamePlaceholder: "Enter your username",
      emailLabel: "Email Address",
      emailPlaceholder: "Enter your email",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter your password",
      confirmPasswordLabel: "Confirm Password",
      confirmPasswordPlaceholder: "Re-enter your password",
      demoRolesLabel: "Quick-Fill Demo Credentials",
      roleAdmin: "Admin",
      roleOperator: "Operator",
      roleFieldOfficer: "Officer",
      roleDriver: "Driver",
      rolePublic: "Public",
      loginSubmitBtn: "Sign In to Platform",
      registerSubmitBtn: "Create Citizen Account",
      authenticating: "Authenticating...",
      unauthorizedTitle: "Access Restricted",
      unauthorizedDesc: "Your account does not have sufficient role permissions to access this control portal.",
      returnHomeBtn: "Return to Control Center",
      signOutBtn: "Sign Out & Switch Account",
      registering: "Registering...",
      platformSubtitle: "North Eastern Region Logistics Intelligence & Security Platform",
      footerInfo: "Smart India Hackathon 2026 • SIH-NER • Enterprise RBAC Protected",
      http403Forbidden: "HTTP 403 Forbidden",
      authenticatedAccount: "Authenticated Account:",
      activeRole: "Active Role:",
      rbacNotice: "Role-Based Access Control (RBAC) restricts this operational interface to authorized roles.",
      viewRoadRiskBtn: "View Public Road Risk",
      returnMissionCockpitBtn: "Return to Mission Cockpit",
      returnFieldReportsBtn: "Return to Field Reports",
      returnControlTowerBtn: "Return to Control Tower",
    },
    network: {
      offlineMode: "Offline Mode",
      noInternet: "No Internet",
      pendingOutbox: "Outbox Pending",
      syncNow: "Sync Now",
      syncing: "Syncing...",
      online: "Online",
      offlineOutboxClear: "Offline outbox clear",
      autoSyncActive: "Auto-sync active",
      mapDegraded: "Map View Degraded",
      mapRetry: "Retry Map",
    },
    modelInfo: {
      title: "Predictive Road Risk AI Model",
      subtitle: "Scikit-Learn Random Forest Classifier Architecture",
      versionLabel: "Model Artifact Version",
      modelTypeLabel: "Architecture Type",
      featuresLabel: "Input Feature Count",
      accuracyLabel: "Validation Accuracy",
      sihDeclarationTitle: "Smart India Hackathon Transparency Declaration",
      sihDeclarationDesc: "Deterministic physical physics filters take absolute precedence over ML predictions in life-critical convoy safety routing.",
      closeBtn: "Close",
    },
    shap: {
      title: "TreeSHAP Feature Attribution",
      subtitle: "Local explainability for corridor risk classification",
      positiveImpact: "Factors Associated with Increased Model Output (+φ)",
      negativeImpact: "Factors Associated with Reduced Model Output (-φ)",
      baseValue: "Model Baseline Prior",
      modelPrediction: "Final Model Output",
      exactLabel: "Exact",
      narrativeTitle: "Attribution Summary",
      closeBtn: "Done",
      probabilitySpace: "Probability-Space",
      featureAnalysisFor: "Feature attribution analysis for {roadName}",
      baselineSub: "E[f(x)] across training distribution",
      operationalThreshold: "Operational Threshold",
      decisionBoundary: "Calibrated decision boundary",
      disruptionLikely: "Disruption Likely",
      disruptionUnlikely: "Disruption Unlikely",
      methodologyTitle: "Non-Causal Statistical Attribution:",
      methodologyDesc: "SHAP (SHapley Additive exPlanations) quantifies which features contributed to shifting the model prediction away from the baseline prior. It reflects learned statistical associations in the training distribution; it does not prove physical causality.",
      noPositiveFactors: "No significant factors driving risk probability upward.",
      noNegativeFactors: "No significant mitigating factors observed.",
      additiveConsistency: "Exact Additive Consistency Verified",
      footerInfo: "TreeSHAP explanations computed in-process via cached singleton",
      factorsCount: "{count} factor(s)",
    },
    predictiveRisk: {
      cardTitle: "AI Predictive Road Risk",
      cardSub: "ML Random Forest & Environmental Telemetry",
      mlModelTitle: "Random Forest Classifier",
      disruptionLikelihood: "Disruption Likelihood",
      thresholdLabel: "Alert Threshold",
      explainShapBtn: "Explain with SHAP",
      modelDetailsBtn: "Model Architecture",
      topFactorsTitle: "Top Contributing Risk Factors",
    },
  },

  hi: {
    nav: {
      controlTower: "कंट्रोल टावर",
      fieldReport: "फील्ड रिपोर्ट",
      alerts: "अलर्ट",
      routes: "मार्ग योजना",
      incidents: "घटनाएं",
      vehicles: "वाहन ट्रैकिंग",
      roads: "सड़क जोखिम",
      analytics: "एनालिटिक्स",
      reportProblem: "खतरे की रिपोर्ट",
      myReports: "मेरी रिपोर्ट",
      live: "लाइव",
      polling: "पोलिंग",
      online: "ऑनलाइन",
      offlineMode: "ऑफलाइन मोड",
      gpsLocked: "जीपीएस लॉक",
      gpsReady: "जीपीएस तैयार",
      searchPlaceholder: "खोजें...",
      logout: "साइन आउट",
      notifications: "सूचनाएं",
      clearNotifications: "सभी हटाएं",
      noNotifications: "कोई नई सूचना नहीं",
      switchTheme: "थीम बदलें",
      lightMode: "लाइट मोड",
      darkMode: "डार्क मोड",
      settings: "सेटिंग्स",
      operations: "परिचालन",
      systemOperational: "प्रणाली चालू है",
      allServicesRunning: "सभी सेवाएं सक्रिय",
    },
    common: {
      refresh: "रीफ्रेश करें",
      refreshing: "रीफ्रेश हो रहा है...",
      filter: "फ़िल्टर",
      clear: "हटाएं",
      close: "बंद करें",
      cancel: "रद्द करें",
      save: "सहेजें",
      saving: "सहेजा जा रहा है...",
      submit: "सबमिट करें",
      submitting: "सबमिट हो रहा है...",
      search: "खोजें",
      export: "निर्यात",
      view: "देखें",
      inspect: "निरीक्षण करें",
      delete: "हटाएं",
      edit: "संपादित करें",
      back: "पीछे",
      next: "आगे",
      previous: "पिछला",
      loading: "लोड हो रहा है...",
      error: "त्रुटि",
      success: "सफल",
      retry: "पुनः प्रयास करें",
      all: "सभी",
      actions: "कार्रवाई",
      status: "स्थिति",
      severity: "गंभीरता",
      date: "तारीख",
      time: "समय",
      location: "स्थान",
      corridor: "कॉरिडोर",
      coordinates: "निर्देशांक",
      riskScore: "जोखिम स्कोर",
      confidence: "विश्वास स्तर",
      assigned: "आवंटित",
      unassigned: "अनावंटित",
      online: "ऑनलाइन",
      offline: "ऑफलाइन",
      verified: "सत्यापित",
      unverified: "असत्यापित",
      rejected: "खारिज",
      active: "सक्रिय",
      resolved: "सुलझाया गया",
      critical: "गंभीर (क्रिटिकल)",
      high: "उच्च (हाई)",
      medium: "मध्यम (मीडियम)",
      low: "कम (लो)",
      normal: "सामान्य",
      details: "विवरण",
      showing: "दिखाया जा रहा है",
      noDataFound: "कोई डेटा नहीं मिला",
      unit: "इकाई",
      speed: "गति",
      eta: "अनुमानित समय",
      distance: "दूरी",
      duration: "अवधि",
      minutes: "मिनट",
      hours: "घंटे",
      km: "किमी",
      kmh: "किमी/घंटा",
      total: "कुल",
      incident: "घटना",
      risk: "जोखिम",
      reported: "सूचित",
    },
    dashboard: {
      controlCentralTitle: "NEXUS-NER केंद्रीय नियंत्रण",
      dispatchTerminal: "गुवाहाटी क्षेत्रीय डिस्पैच टर्मिनल",
      geofencingActive: "पोस्टजीआईएस जियोफेंसिंग सक्रिय",
      citizenReports: "नागरिक रिपोर्टें:",
      unverifiedReports: "असत्यापित",
      verifiedReports: "सत्यापित",
      rejectedReports: "खारिज",
      telemetrySynced: "टेलीमेट्री समक्रमित",
      backendOffline: "बैकएंड ऑफलाइन",
      autoRefresh: "लाइव • 30 सेकंड में स्वतः रीफ्रेश",
      postgisLive: "पोस्टजीआईएस लाइव",
      criticalDisruptionActive: "गंभीर व्यवधान सक्रिय",
      incidentStatus: "घटना #{id} • स्थिति: {status}",
      executeDynamicDetour: "सुरक्षित वैकल्पिक मार्ग अपनाएं →",
      inspectIncident: "घटना का निरीक्षण करें →",
      causalChainTitle: "परिचालन प्रभाव श्रृंखला (Causal Chain)",
      interactiveGraph: "इंटरैक्टिव टेलीमेट्री ग्राफ",
      roadNode: "सड़क #{id}",
      riskNode: "जोखिम: {score}",
      alertActiveNode: "सक्रिय चेतावनी",
      vehicleNode: "वाहन {number}",
      tripNode: "ट्रिप #{id}",
      activeConvoysTitle: "सक्रिय काफिले",
      activeConvoysSub: "निगरानी अधीन आपूर्ति वाहन",
      disruptionsTitle: "कॉरिडोर व्यवधान",
      disruptionsSub: "सक्रिय खतरे की चेतावनियां",
      criticalAlertsTitle: "गंभीर अलर्ट",
      criticalAlertsSub: "तत्काल ध्यान देने की आवश्यकता",
      roadRiskTitle: "सड़क जोखिम सूचकांक",
      roadRiskSub: "क्षेत्रीय कॉरिडोर औसत",
      fleetPassable: "कॉरिडोर खुले और सुगम हैं",
      fleetAttention: "काफिलों को वैकल्पिक मार्ग की जरूरत",
      safeAlternative: "सुरक्षित वैकल्पिक मार्ग सक्रिय",
      mapTitle: "NEXUS-NER जीआईएस परिचालन मानचित्र",
      mapSub: "राजमार्गों की वास्तविक समय टेलीमेट्री और खतरे का दृश्य",
      mapFallback: "मानचित्र टाइलें अनुपलब्ध — ऑफलाइन मोड",
      legendOrigin: "प्रस्थान स्थल",
      legendDestination: "गंतव्य",
      legendTelemetry: "वाहन जीपीएस",
      legendBlocked: "सक्रिय अवरोध",
      threatTitle: "कॉरिडोर खतरा मूल्यांकन",
      threatSub: "मशीन लर्निंग व पोस्टजीआईएस स्थानिक विश्लेषण",
      threatScore: "खतरा स्कोर",
      threatLevelCritical: "उच्च जोखिम — व्यवधान की पूरी संभावना",
      threatLevelModerate: "मध्यम जोखिम — सावधानी से पारगमन करें",
      threatLevelLow: "कम जोखिम — कॉरिडोर पूर्णतः सुरक्षित",
      threatExplanation: "रैंडम फॉरेस्ट मॉडल द्वारा लाइव मौसम, मिट्टी की नमी व भूस्खलन सेंसरों के आधार पर विश्लेषित।",
      weatherTitle: "क्षेत्रीय मौसम आसूचना",
      weatherSub: "पूर्वोत्तर कॉरिडोरों की उच्च-सटीक टेलीमेट्री",
      temp: "तापमान",
      feelsLike: "अनुभूत तापमान",
      humidity: "आर्द्रता",
      rain: "वर्षा मात्रा",
      rainProb: "वर्षा की संभावना",
      wind: "हवा की गति",
      pressure: "वायुमंडलीय दबाव",
      visibility: "दृश्यता",
      observedAt: "अवलोकन समय",
      source: "स्रोत",
      fleetTitle: "सक्रिय बेड़े की टेलीमेट्री",
      fleetSub: "लाइव जीपीएस निर्देशांक, माल विवरण और पारगमन स्थिति",
      tableColUnit: "वाहन / पंजीयन सं.",
      tableColStatus: "आवागमन स्थिति",
      tableColLocation: "वर्तमान निर्देशांक",
      tableColCargo: "कार्गो विवरण",
      tableColPriority: "प्राथमिकता",
      tableColTrip: "आवंटित ट्रिप",
      liveTracking: "लाइव ट्रैकिंग",
      recentAlertsTitle: "हाल की गंभीर चेतावनियां",
      recentAlertsSub: "स्वचालित जियोफेंस सूचनाएं और खतरे की चेतावनी",
      viewAllAlerts: "सभी अलर्ट देखें",
      noAlerts: "नेटवर्क पर कोई सक्रिय अलर्ट नहीं है।",
    },
    driverCockpit: {
      missionActive: "सक्रिय मिशन",
      assignedVehicle: "आवंटित वाहन",
      tripId: "ट्रिप आईडी",
      corridor: "आवंटित कॉरिडोर",
      cargoManifest: "कार्गो विवरण",
      priority: "प्राथमिकता",
      missionStatus: "मिशन स्थिति",
      hazardAlert: "गंभीर कॉरिडोर व्यवधान",
      corridorRisk: "कॉरिडोर जोखिम सूचकांक",
      activeDetour: "सुरक्षित वैकल्पिक मार्ग सक्रिय",
      viewSafeRoute: "सुरक्षित मार्ग देखें",
      transmitGps: "लाइव जीपीएस प्रसारित करें",
      gpsTransmitting: "लाइव जीपीएस प्रसारण सक्रिय",
      gpsStandby: "टेलीमेट्री स्टैंडबाय — प्रसारित नहीं",
      lastTelemetry: "अंतिम प्रसारित टेलीमेट्री",
      noActiveMission: "कोई सक्रिय मिशन आवंटित नहीं",
      detourRecommended: "कंट्रोल टावर द्वारा सुरक्षित मार्ग जारी",
      detourDescription: "सक्रिय कॉरिडोर व्यवधान से बचते हुए सुरक्षित वैकल्पिक मार्ग निर्धारित किया गया है",
      unassignedNotice: "वर्तमान में आपके टर्मिनल पर कोई वाहन आवंटित नहीं है। वाहन आवंटन हेतु कंट्रोल सेंट्रल डिस्पैच से संपर्क करें।",
      noVehicleAssignedTitle: "कोई सक्रिय वाहन आवंटित नहीं",
      noVehicleAssignedDesc: "प्रमाणित चालक: {user}। वर्तमान में कोई वाहन आवंटित नहीं।",
      terminalStandby: "टर्मिनल स्थिति: स्टैंडबाय / अनावंटित",
      dispatchApproved: "डिस्पैच स्वीकृत",
      riskScoreLabel: "जोखिम स्कोर",
    },
    incidents: {
      title: "घटना निगरानी एवं अंतर्ग्रहण",
      subtitle: "सड़क कॉरिडोर खतरों की समीक्षा, सत्यापन और प्रबंधन करें",
      nlpButtonOpen: "एआई / एनएलपी अंतर्ग्रहण",
      nlpButtonClose: "एनएलपी सहायक बंद करें",
      nlpTitle: "एआई / एनएलपी घटना निष्कर्षण सहायक",
      nlpBadge: "परामर्श अंतर्ग्रहण",
      nlpDesc: "नागरिक संदेश, व्हाट्सएप सूचना या रेडियो संवाद यहां पेस्ट करके घटना विवरण निकालें। ये प्रारंभिक रूप से असत्यापित दर्ज होते हैं।",
      nlpPlaceholder: "उदा. गंगटोक के निकट NH-10 पर मूसलाधार बारिश से भारी भूस्खलन। दोनों लेन अवरुद्ध हैं और कई मालवाहक ट्रक फंसे हुए हैं।",
      nlpAnalyzeBtn: "एआई से रिपोर्ट का विश्लेषण करें",
      nlpAnalyzing: "एनएलपी विश्लेषण जारी...",
      nlpClear: "साफ़ करें",
      candidateTitle: "निकाला गया घटना प्रारूप",
      candidateBadge: "एआई द्वारा निष्कर्षित — सत्यापन आवश्यक",
      providerLabel: "प्रदाता",
      typeLabel: "घटना प्रकार",
      severityLabel: "गंभीरता",
      confidenceLabel: "विश्वसनीयता",
      corridorLabel: "कॉरिडोर संदर्भ",
      descLabel: "विवरण",
      locationRefLabel: "स्थान संदर्भ",
      noticeLabel: "सूचना",
      acceptCandidateBtn: "स्वीकारें और घटना बनाएं",
      creatingBtn: "घटना बनाई जा रही है...",
      dismissCandidateBtn: "खारिज करें",
      totalIncidents: "कुल घटनाएं",
      totalIncidentsSub: "डेटाबेस में दर्ज",
      criticalHazards: "गंभीर खतरे",
      criticalHazardsSub: "यातायात के लिए तत्काल जोखिम",
      activeBlockages: "सक्रिय सड़क अवरोध",
      activeBlockagesSub: "वर्तमान में बंद रास्ते",
      avgRisk: "औसत जोखिम स्कोर",
      avgRiskSub: "सभी घटनाओं का औसत",
      searchPlaceholder: "शीर्षक, कॉरिडोर या जिले द्वारा खोजें...",
      filterSeverity: "गंभीरता अनुसार फ़िल्टर",
      filterStatus: "स्थिति अनुसार फ़िल्टर",
      hideTest: "परीक्षण डेटा छुपाएं",
      showingCount: "{total} में से {count} घटनाएं प्रदर्शित",
      colId: "आईडी",
      colIncident: "घटना",
      colCorridor: "कॉरिडोर / स्थान",
      colSeverity: "गंभीरता",
      colRisk: "जोखिम स्कोर",
      colStatus: "स्थिति",
      colTime: "समय",
      colActions: "कार्रवाई",
      inspectBtn: "निरीक्षण",
      noIncidentsFound: "कोई मेल खाती घटना नहीं मिली।",
      modalTitle: "घटना का विस्तृत निरीक्षण",
      modalSubtitle: "घटना #{id} — परिचालन टेलीमेट्री और प्रभाव विश्लेषण",
      tabOverview: "अवलोकन व टेलीमेट्री",
      tabCausal: "प्रभाव श्रृंखला (Causal)",
      tabActions: "ऑपरेटर कार्रवाई",
      causalTitle: "व्यवधान प्रसार श्रृंखला",
      causalDesc: "घटना के मूल कारण से लेकर सड़क, चेतावनी, वाहन और यात्रा पर असर का दृश्य।",
      operatorTitle: "ऑपरेटर सत्यापन नियंत्रण",
      operatorDesc: "सत्यापन के उपरांत यह घटना जोखिम इंजन में सक्रिय होकर स्वचालित डायनेमिक रूटिंग को सक्रिय करती है।",
      verifyBtn: "सत्यापित करें और सक्रिय करें",
      rejectBtn: "रिपोर्ट खारिज करें (गलत सूचना)",
      resolveBtn: "घटना सुलझ गई चिह्नित करें",
      rerouteBtn: "वैकल्पिक मार्ग की गणना करें",
      statusUpdatedSuccess: 'घटना #{id} की स्थिति सफलतापूर्वक "{status}" कर दी गई।',
      permissionDenied: "अनुमति अस्वीकृत: ADMIN या CONTROL_OPERATOR भूमिका आवश्यक है।",
    },
    vehicles: {
      title: "बेड़ा परिचालन व टेलीमेट्री",
      subtitle: "लाइव जीपीएस ट्रैकिंग, वाहन स्वास्थ्य एवं मिशन आवंटन",
      totalVehicles: "कुल बेड़ा इकाइयां",
      totalVehiclesSub: "प्रणाली में पंजीकृत",
      inTransit: "पारगमन में (चल रहा)",
      inTransitSub: "सड़क पर सक्रिय",
      delayed: "विलंबित",
      delayedSub: "खतरों के कारण रुका",
      stoppedOffline: "रुका हुआ / ऑफलाइन",
      stoppedOfflineSub: "स्टैंडबाय या संपर्क टूटा",
      searchPlaceholder: "वाहन नंबर, प्रकार या माल द्वारा खोजें...",
      tabAll: "सभी वाहन",
      tabMoving: "चल रहे",
      tabDelayed: "विलंबित",
      tabStopped: "रुके हुए",
      tabOffline: "ऑफलाइन",
      tabIdle: "खाली (आइडल)",
      colVehicle: "वाहन / इकाई",
      colType: "प्रकार",
      colStatus: "स्थिति",
      colCargo: "कार्गो विवरण",
      colPriority: "प्राथमिकता",
      colTrip: "ट्रिप आईडी",
      colGps: "लाइव जीपीएस",
      colActions: "कार्रवाई",
      viewDetails: "विवरण देखें",
      noVehiclesFound: "दिए गए मापदंडों से कोई वाहन मेल नहीं खाता।",
      modalTitle: "वाहन टेलीमेट्री निरीक्षण",
      unitDetails: "इकाई विनिर्देश",
      cargoDetails: "कार्गो व प्राथमिकता",
      telemetryDetails: "जीपीएस व टेलीमेट्री स्थिति",
      assignmentDetails: "ट्रिप आवंटन",
      unassignedTrip: "कोई सक्रिय ट्रिप आवंटित नहीं",
      liveGpsSignal: "लाइव सिग्नल समक्रमित",
      lastSeen: "अंतिम संपर्क",
      totalUnits: "कुल इकाइयां",
    },
    routes: {
      title: "डायनेमिक रूट प्लानर व सिम्युलेटर",
      subtitle: "एआई-संचालित लंबवत कॉरिडोर बाईपास और खतरा परिहार",
      calculateBtn: "मार्ग की गणना करें",
      calculatingBtn: "गणना जारी...",
      rerouteBtn: "वैकल्पिक मार्ग का मूल्यांकन",
      reroutingBtn: "मार्ग खोज जारी...",
      searchTrip: "प्रस्थान या गंतव्य द्वारा ट्रिप खोजें...",
      tripListTitle: "ट्रिप मिशन चुनें",
      priorityBadge: "प्राथमिकता",
      cargoBadge: "कार्गो",
      selectTripPrompt: "मार्ग देखने या वैकल्पिक मार्ग का मूल्यांकन करने के लिए सूची से एक ट्रिप चुनें।",
      noTripsFound: "कोई ट्रिप नहीं मिली।",
      simulatorTitle: "पारगमन सिम्युलेटर कॉकपिट",
      speedLabel: "सिम्युलेशन गति",
      startSim: "सिम्युलेशन शुरू करें",
      pauseSim: "सिम्युलेशन रोकें",
      resetSim: "स्थान रीसेट करें",
      simulatingText: "कॉरिडोर पर वाहन की गति का अनुकरण जारी...",
      mapTitle: "मार्ग जीआईएस विज़ुअलाइज़ेशन",
      mapSubActive: "डायनेमिक डायवर्जन सक्रिय — अवरुद्ध कॉरिडोर की सुरक्षित मार्ग से तुलना",
      mapSubIdle: "ट्रिप चुनें और मार्ग की गणना या डायवर्जन का मूल्यांकन करें",
      safeDetourActive: "सुरक्षित वैकल्पिक मार्ग सक्रिय",
      routeBlockedDelayed: "मार्ग अवरुद्ध — विलंबित",
      routeCalculated: "मार्ग परिकलित",
      offlineBanner: "मानचित्र टाइलें अनुपलब्ध — ऑफलाइन मोड",
      comparisonTitle: "डायनेमिक डायवर्जन तुलना",
      comparisonSub: "पोस्टजीआईएस लंबवत कॉरिडोर बाईपास मूल्यांकन",
      originalBlocked: "मूल अवरुद्ध कॉरिडोर",
      detourProposed: "प्रस्तावित सुरक्षित मार्ग",
      timeDelta: "समय अंतर",
      distanceDelta: "दूरी अंतर",
      riskDelta: "जोखिम में कमी",
      aiTradeOffTitle: '"यही मार्ग क्यों?" — एआई निर्णय विश्लेषण',
      aiTradeOffSub: "स्वचालित वैकल्पिक मार्ग चयन का तार्किक आधार",
      tradeOffText: "प्रणाली ने न्यूनतम व्यवधान संभावना, सड़क वहन क्षमता और सक्रिय जियोफेंस खतरों से बचाव के आधार पर इस इष्टतम मार्ग का चयन किया।",
      riskAvoidance: "खतरे वाले क्षेत्र से पूर्णतः सुरक्षित",
      resultTitle: "मार्ग गणना परिणाम",
      distanceLabel: "दूरी",
      etaLabel: "अनुमानित समय",
      statusLabel: "स्थिति",
      assignedVehicleLabel: "आवंटित वाहन",
      gisBannerTitle: "एआई जोखिम-सचेत जीआईएस रूटिंग इंजन सक्रिय",
      gisBannerDesc: "पोस्टजीआईएस स्थानिक डेटाबेस और ओएसआरएम रूटिंग इंजन से जुड़ा हुआ। सत्यापित खतरों के चारों ओर सुरक्षित मार्ग निकालता है।",
      osrmStatus: "ओएसआरएम रूटिंग इंजन: ऑनलाइन",
      corridorSnapping: "कॉरिडोर स्नैपिंग: सक्रिय",
      aiRiskScoring: "एआई जोखिम स्कोरिंग: वास्तविक समय",
      hazardAvoidance: "खतरा परिहार: सक्षम",
    },
    alerts: {
      title: "परिचालन अलर्ट व आसूचना",
      subtitle: "लाइव व्यवधान चेतावनियां, जियोफेंस उल्लंघन एवं निवारण",
      totalAlerts: "कुल अलर्ट",
      totalAlertsSub: "प्रणाली में दर्ज अलर्ट",
      criticalAlerts: "गंभीर अलर्ट",
      criticalAlertsSub: "तत्काल कार्रवाई आवश्यक",
      highMediumAlerts: "उच्च / मध्यम अलर्ट",
      highMediumAlertsSub: "कॉरिडोर विलंब व मौसम अलर्ट",
      activeUnresolved: "सक्रिय (अनसुलझे)",
      activeUnresolvedSub: "वर्तमान में कतार में लंबित",
      searchPlaceholder: "संदेश, कॉरिडोर या स्थान द्वारा खोजें...",
      filterSeverityAll: "सभी गंभीरता स्तर",
      filterStatusAll: "सभी स्थितियां",
      statusActive: "सक्रिय",
      statusAcknowledged: "स्वीकृत (देखा गया)",
      statusResolved: "सुलझाया गया",
      acknowledgeBtn: "स्वीकार करें",
      resolveBtn: "सुलझाएं",
      acknowledgedBadge: "स्वीकृत",
      resolvedBadge: "सुलझा हुआ",
      noAlertsFound: "दिए गए फ़िल्टर से कोई अलर्ट मेल नहीं खाता।",
      sourcesTitle: "आसूचना स्रोत",
      sourcesSub: "अलर्ट प्रणाली को डेटा प्रदान करने वाले लाइव स्रोत",
      sourceWeather: "आईएमडी मौसम रडार और वर्षा डेटा",
      sourceIncident: "फील्ड अधिकारी रिपोर्ट व नागरिक सूचनाएं",
      sourceGps: "लाइव वाहन जियोफेंस निगरानी",
      sourceAiModel: "पूर्वानुमानित सड़क जोखिम एमएल मॉडल",
    },
    roads: {
      title: "सड़क व कॉरिडोर जोखिम",
      subtitle: "पोस्टजीआईएस कॉरिडोर एवं वास्तविक समय खतरा निगरानी",
      totalCorridors: "कुल निगरानी अधीन कॉरिडोर",
      highRiskCorridors: "उच्च जोखिम वाले कॉरिडोर",
      accessibleCorridors: "सुगम (खुले) कॉरिडोर",
      avgNetworkRisk: "औसत नेटवर्क जोखिम",
      searchPlaceholder: "कॉरिडोर नाम, हाईवे या जिले द्वारा खोजें...",
      colCorridor: "कॉरिडोर / खंड",
      colHighway: "राष्ट्रीय राजमार्ग",
      colRegion: "क्षेत्र / राज्य",
      colRiskLevel: "जोखिम स्तर",
      colProbability: "व्यवधान संभावना",
      colStatus: "स्थिति",
      inspectRiskBtn: "जोखिम देखें",
      noRoadsFound: "कोई सड़क कॉरिडोर नहीं मिला।",
      statusOpen: "खुला है",
      statusRestricted: "प्रतिबंधित",
      statusUnderRepair: "मरम्मत जारी",
      statusBlocked: "अवरुद्ध (बंद)",
      modalTitle: "कॉरिडोर जोखिम विश्लेषण",
      modalSub: "एआई मॉडल मूल्यांकन व मानवीय स्थिति नियंत्रण",
      riskScore: "जोखिम मूल्यांकन",
      treeShapAttributions: "TreeSHAP कारक योगदान",
      deterministicFactors: "भौतिक जोखिम संकेतक",
      overrideStatusTitle: "ऑपरेटर द्वारा स्थिति परिवर्तन",
      overrideStatusDesc: "जीआईएस रूटिंग नेटवर्क में सड़क कॉरिडोर की परिचालन उपलब्धता स्थिति बदलें।",
      saveStatusBtn: "स्थिति अपडेट करें",
      updatingStatus: "अपडेट हो रहा है...",
      aiPowered: "एआई संचालित",
      refreshRisk: "जोखिम ताज़ा करें",
      engineTitle: "पूर्वानुमानित सुगमता इंजन",
      engineDesc: "जोखिम स्कोर इलाके की विशेषताओं, ऐतिहासिक घटनाओं, सड़क की स्थिति और व्यवधान संकेतों को मिलाकर संभावित लॉजिस्टिक्स प्रभाव का अनुमान लगाते हैं।",
      modelStatus: "मॉडल स्थिति",
      operational: "सक्रिय (परिचालन में)",
      immediateAction: "तत्काल कार्रवाई",
      closelyMonitor: "बारीकी से निगरानी करें",
      monitorConditions: "स्थितियों की निगरानी करें",
      normalOperations: "सामान्य परिचालन",
      mapTitle: "जोखिम वितरण मानचित्र",
      mapSub: "पूर्वोत्तर क्षेत्र में अनुमानित व्यवधान केंद्र",
      highestRiskTitle: "सर्वोच्च जोखिम गलियारा",
      highestRiskSub: "ऑपरेटर समीक्षा के लिए प्राथमिकता क्षेत्र",
      riskScoreRatio: "जोखिम स्कोर / 100",
      viewAnalysis: "जोखिम विश्लेषण देखें",
      tableTitle: "सड़क जोखिम मूल्यांकन",
      tableSub: "निगरानी वाले सड़क खंडों के लिए एआई-जनित जोखिम स्कोर",
      segmentsCount: "{count} खंड",
      colHazard: "खतरा",
      colConfidence: "एआई विश्वसनीयता",
      aiPrediction: "एआई भविष्यवाणी",
      aiPredictionSub: "मशीन लर्निंग जोखिम स्कोरिंग",
      aiPredictionDesc: "ऐतिहासिक भूस्खलन और सड़क की स्थिति के पैटर्नों को वर्तमान संकेतों के साथ जोड़कर व्यवधान की संभावना का अनुमान लगाया जाता है।",
      weatherSignals: "मौसम संकेत",
      weatherSignalsSub: "वर्षा और पर्यावरणीय स्थितियां",
      weatherSignalsDesc: "मौसम की स्थिति बाढ़, भूस्खलन और सड़क सुगमता में गिरावट की संभावना को बढ़ा सकती है।",
      roadCondition: "सड़क की स्थिति",
      roadConditionSub: "सतह और सुगमता संकेतक",
      roadConditionDesc: "सतह की गुणवत्ता, चिकनाई, भूभाग और ऐतिहासिक घटनाएं संवेदनशील लॉजिस्टिक्स गलियारों की पहचान करने में मदद करती हैं।",
      hazardType: "खतरे का प्रकार",
      material: "सामग्री",
      surface: "सतह",
      notAvailable: "उपलब्ध नहीं",
      aiRecommendation: "एआई अनुशंसा",
      aiRecommendationDesc: "जब इस गलियारे का जोखिम स्कोर बढ़ा रहे, तो वैकल्पिक रूटिंग और अधिक निगरानी पर विचार करें।",
      operatorControlTitle: "ऑपरेटर गलियारा स्थिति नियंत्रण",
      roleLabel: "भूमिका",
      operatorControlDesc: "नेटवर्क जोखिम को समायोजित करने और भविष्य कहने वाले मॉडल की पुनर्गणना के लिए लाइव गलियारे की परिचालन स्थिति अपडेट करें।",
    },
    analytics: {
      title: "लॉजिस्टिक्स व जोखिम एनालिटिक्स",
      subtitle: "बेड़ा कार्यक्षमता, खतरा आवृत्ति और कॉरिडोर सुदृढ़ता मेट्रिक्स",
      timeRange: "समय सीमा",
      last24h: "पिछले 24 घंटे",
      last7d: "पिछले 7 दिन",
      last30d: "पिछले 30 दिन",
      lastQuarter: "पिछली तिमाही",
      routesCompleted: "पूर्ण मार्ग",
      routesCompletedSub: "चयनित अवधि में पूर्ण मिशन",
      avgEta: "औसत पारगमन समय",
      avgEtaSub: "मानक कॉरिडोर अवधि",
      activeVehicles: "सक्रिय वाहन",
      activeVehiclesSub: "डेटा संचारित कर रहे काफिले",
      accessibilityRate: "कॉरिडोर सुगमता दर",
      accessibilityRateSub: "खुली पारगमन क्षमता",
      incidentTrendTitle: "दिन अनुसार घटनाएं",
      incidentTrendSub: "रिपोर्टिंग अवधि में कॉरिडोर व्यवधान का रुझान",
      deliveryTrendTitle: "पारगमन समय विचलन (घंटे)",
      deliveryTrendSub: "वास्तविक पारगमन समय बनाम निर्धारित समय",
      regionalTitle: "क्षेत्रीय गतिविधि वितरण",
      regionalSub: "पूर्वोत्तर राज्यों अनुसार सक्रिय वाहन व घटनाएं",
      riskDistTitle: "कॉरिडोर जोखिम वितरण",
      riskDistSub: "जोखिम श्रेणियों अनुसार राजमार्गों का अनुपात",
      corridorTableTitle: "उच्च-प्राथमिकता वाले राजमार्ग",
      corridorTableSub: "प्रमुख मार्गों की कार्यक्षमता और सुगमता मेट्रिक्स",
      insightsTitle: "परिचालन एआई अंतर्दृष्टि",
      insight1: "धेमाजी जिले में लगातार बारिश के कारण NH-15 कॉरिडोर जोखिम बढ़ा हुआ है।",
      insight2: "NH-27 डायवर्जन मार्ग से पारगमन समय में औसतन 42 मिनट की बचत हुई है।",
      insight3: "वाहन बेड़े की उपयोगिता वर्तमान में 85% है और कोई अनसुलझा गंभीर अलर्ट नहीं है।",
      fleetUtilization: "बेड़ा उपयोगिता",
      routeSafety: "रूट सुरक्षा सूचकांक",
      incidentResolution: "घटना समाधान दर",
      footerTitle: "एनालिटिक्स आसूचना",
      footerDesc: "पूर्वोत्तर क्षेत्र में वाहन टेलीमेट्री, सत्यापित घटनाओं, सड़क-जोखिम आकलनों, रूट इतिहास और क्षेत्रीय लॉजिस्टिक्स गतिविधि से गणना किए गए लाइव परिचालन एनालिटिक्स।",
      totalMonitoredRoads: "कुल निगरानी वाली सड़कें",
      safeLowRisk: "सुरक्षित / कम जोखिम",
    },
    fieldReport: {
      title: "फील्ड रिपोर्ट",
      subtitle: "क्षेत्र से जियो-टैग्ड सड़क और घटना रिपोर्ट सबमिट करें",
      languageLabel: "भाषा",
      outboxActiveTitle: "स्थान और ऑफलाइन आउटबॉक्स सक्रिय",
      outboxActiveDesc: "कम नेटवर्क वाले क्षेत्रों में दर्ज की गई रिपोर्ट सुरक्षित ऑफलाइन SQLite/IDB आउटबॉक्स में सहेजी जाती हैं। नेटवर्क वापस आने पर वे स्वचालित रूप से POST /sync/batch के माध्यम से सिंक होती हैं।",
      pendingOutboxBadge: "आउटबॉक्स में लंबित",
      syncNowBtn: "अभी आउटबॉक्स सिंक करें",
      syncingBtn: "सिंकिंग जारी...",
      allSynced: "आउटबॉक्स खाली — सभी रिपोर्ट सिंक हो चुकी हैं",
      formTitle: "घटना विवरण",
      formSubtitle: "वास्तविक समय में सड़क सुगमता व्यवधान दर्ज करें",
      incidentTypeLabel: "घटना का प्रकार",
      selectTypePrompt: "घटना वर्गीकरण चुनें...",
      typeLandslide: "भूस्खलन",
      typeFlood: "बाढ़ / जलभराव",
      typeRoadBlockage: "सड़क अवरोध",
      typeRoadDamage: "सड़क क्षति",
      typeWeatherDisruption: "मौसम व्यवधान",
      typeOther: "अन्य व्यवधान",
      severityLabel: "गंभीरता स्तर",
      sevCritical: "गंभीर (क्रिटिकल)",
      sevHigh: "उच्च (हाई)",
      sevMedium: "मध्यम (मीडियम)",
      sevLow: "कम (लो)",
      descriptionLabel: "फील्ड अवलोकन और विवरण",
      descriptionPlaceholder: "सड़क की स्थिति, प्रभावित खंड, वाहन पारगमन क्षमता या निकासी समय का विवरण दें...",
      locationLabel: "स्थान का नाम / लैंडमार्क",
      locationNamePlaceholder: "उदा. जोरबाट के पास NH-27, 42 किमी मार्कर",
      latitudeLabel: "अक्षांश (Latitude)",
      longitudeLabel: "देशांतर (Longitude)",
      useGpsBtn: "जीपीएस स्थिति प्राप्त करें",
      locatingBtn: "प्राप्त कर रहा है...",
      nerPresetsLabel: "पूर्वोत्तर परीक्षण प्रीसेट",
      presetGuwahati: "गुवाहाटी (NH-27)",
      presetShillong: "शिलांग (NH-6)",
      presetTezpur: "तेजपुर (NH-15)",
      presetGangtok: "गंगटोक (NH-10)",
      photoLabel: "दृश्य साक्ष्य / फोटो (वैकल्पिक)",
      takePhotoBtn: "कैमरे से फोटो लें",
      photoGalleryBtn: "गैलरी से चुनें",
      photoAttachedText: "फोटो ली गई और स्थानीय ऑफलाइन स्टोरेज में सहेजी गई",
      removePhotoBtn: "साक्ष्य हटाएं",
      submitReportBtn: "फील्ड रिपोर्ट सबमिट करें",
      submittingBtn: "सबमिट हो रहा है...",
      saveDraftBtn: "स्थानीय ड्राफ्ट सहेजें",
      savingDraftBtn: "सहेजा जा रहा है...",
      errSelectType: "कृपया सबमिट करने से पहले घटना का प्रकार चुनें।",
      errInvalidCoords: "कृपया वैध संख्यात्मक जीपीएस निर्देशांक प्रदान करें।",
      errOutsideNer: "निर्देशांक पूर्वोत्तर क्षेत्र सीमा [20-30°N, 88-98°E] से बाहर हैं।",
      draftSavedSuccess: "ड्राफ्ट स्थानीय रूप से ऑफलाइन स्टोरेज में सहेजा गया।",
      reportQueuedOffline: "ऑफलाइन — रिपोर्ट स्थानीय आउटबॉक्स में सहेजी गई (लंबित)। नेटवर्क लौटने पर स्वचालित रूप से सिंक होगी।",
      reportSyncingOnline: "रिपोर्ट कतारबद्ध। कंट्रोल टावर के साथ सिंक हो रही है...",
      reportSyncedSuccess: "रिपोर्ट कंट्रोल टावर के साथ सफलतापूर्वक सिंक हो गई।",
      reportEnqueuedRetry: "रिपोर्ट आउटबॉक्स में कतारबद्ध। सिंक स्वचालित रूप से पुनः प्रयास करेगा।",
      aiAssistantTitle: "एआई/एनएलपी घटना निष्कर्षण सहायक",
      aiAssistantSubtitle: "असंरचित रिपोर्ट को संरचित ड्राफ्ट में बदलें",
      aiInputPlaceholder: "फील्ड नोट्स, नागरिक रिपोर्ट या रेडियो संदेश का पाठ यहां चिपकाएं (उदा. 'गुवाहाटी और तेजपुर के बीच NH-27 पर भारी भूस्खलन की सूचना...')...",
      aiExtractBtn: "एआई से घटना निकालें",
      aiExtractingBtn: "विश्लेषण जारी...",
      aiApplyDraftBtn: "निकाले गए ड्राफ्ट को फॉर्म में लागू करें",
      aiDisclaimer: "एआई-निकाला गया उम्मीदवार — सबमिट करने से पहले फील्ड अधिकारी द्वारा सत्यापन आवश्यक है।",
      aiConfidence: "विश्वास स्तर",
      aiProvider: "प्रदाता",
      recentReportsTitle: "हाल की फील्ड रिपोर्ट",
      recentReportsSubtitle: "हाल ही में कतारबद्ध और सबमिट की गई फील्ड रिपोर्ट",
      totalReportsCount: "कुल",
      statusVerified: "सत्यापित",
      statusPendingSync: "सिंक लंबित",
      statusDraft: "स्थानीय ड्राफ्ट",
      noReportsYet: "अभी तक कोई फील्ड रिपोर्ट दर्ज नहीं की गई है।",
      publicQueueTitle: "नागरिक खतरा रिपोर्टें (समीक्षा कतार)",
      publicQueueSub: "अधिकारी के सत्यापन की प्रतीक्षा कर रहे सार्वजनिक अवलोकन",
      verifyPublicBtn: "घटना के रूप में सत्यापित करें",
      rejectPublicBtn: "रिपोर्ट खारिज करें",
      reviewNotesPlaceholder: "समीक्षा टिप्पणी (वैकल्पिक)...",
      aiVerificationTitle: "एआई सत्यापन",
      aiVerificationSub: "स्वचालित घटना सत्यापन",
      verificationPipeline: "सत्यापन पाइपलाइन",
      processingSubmission: "सबमिशन संसाधित हो रहा है...",
      readyForReport: "फील्ड रिपोर्ट के लिए तैयार",
      imageEvidence: "छवि साक्ष्य",
      attachedLocal: "संलग्न (स्थानीय)",
      pendingStatus: "लंबित",
      locationValidation: "स्थान सत्यापन",
      nerValidated: "पूर्वोत्तर क्षेत्र सत्यापित",
      pendingGps: "जीपीएस लंबित",
      verificationDesc: "कॉरिडोर अलर्ट जारी करने से पहले रिपोर्ट का जियो-लोकेशन जोखिम मैपिंग और घटना वर्गीकरण के साथ विश्लेषण किया जाता है।",
      gpsInfoTitle: "जीपीएस जानकारी",
      gpsInfoSub: "वर्तमान डिवाइस स्थिति",
      gpsStatusLabel: "स्थिति",
      positionAcquired: "स्थिति प्राप्त हुई",
      readyOnDemand: "मांग पर तैयार",
      accuracyLabel: "सटीकता",
      lastUpdateLabel: "अंतिम अपडेट",
      neverLabel: "कभी नहीं",
      emptyPublicQueue: "कतार में कोई असत्यापित नागरिक रिपोर्ट लंबित नहीं है। सभी अवलोकन संसाधित हैं।",
      processingBtn: "संसाधित हो रहा है...",
      advisoryIngestionBadge: "परामर्श अंतर्ग्रहण",
      hideAssistant: "सहायक छिपाएं",
      showAssistant: "सहायक दिखाएं",
      takePhotoSub: "डिवाइस पर फोटो लें",
      uploadGallerySub: "स्थानीय फ़ाइल अपलोड करें",
      statusPending: "लंबित",
    },
    publicReport: {
      portalBadge: "नागरिक सड़क अवलोकन पोर्टल",
      portalTitle: "नागरिक सड़क स्थिति रिपोर्ट",
      portalSubtitle: "पूर्वोत्तर क्षेत्र में आपातकालीन आपूर्ति गलियारों को सुरक्षित रखने में NEXUS-NER की सहायता करें।",
      guardrailTitle: "सत्यापन सुरक्षात्मक नियम (आरंभिक स्थिति: असत्यापित):",
      guardrailDesc: "सभी नागरिक रिपोर्टें असत्यापित स्थिति में प्राप्त होती हैं और फील्ड अधिकारियों द्वारा जांची जाती हैं। रिपोर्ट करने से तत्काल सड़कें बंद नहीं होतीं।",
      hazardCategoryLabel: "खतरे / समस्या की श्रेणी",
      impactLevelLabel: "अनुमानित प्रभाव स्तर",
      corridorOptionalLabel: "प्रभावित राजमार्ग / कॉरिडोर (वैकल्पिक)",
      corridorOptionalPlaceholder: "-- कॉरिडोर चुनें या खाली छोड़ें --",
      locationLabel: "स्थान के निर्देशांक (पूर्वोत्तर क्षेत्र)",
      useGpsBtn: "डिवाइस जीपीएस का उपयोग करें",
      acquiringGps: "जीपीएस प्राप्त हो रहा है...",
      latLabel: "अक्षांश [20° - 30°N]",
      lonLabel: "देशांतर [88° - 98°E]",
      gpsAccuracy: "✓ डिवाइस सेंसर से प्राप्त (सटीकता ±{acc} मीटर)",
      descriptionLabel: "विवरण और प्रत्यक्ष अवलोकन",
      descriptionPlaceholder: "सड़क की स्थिति का वर्णन करें: उदा. पुल के 5 किमी पूर्व में भूस्खलन से दोनों लेन बंद। भारी बारिश जारी है।",
      charCount: "{count}/2000",
      submitBtn: "सड़क समस्या रिपोर्ट सबमिट करें",
      submittingBtn: "रिपोर्ट सबमिट हो रही है...",
      successTitle: "रिपोर्ट सफलतापूर्वक सबमिट हुई",
      refLabel: "रिपोर्ट संदर्भ संख्या",
      reviewNoticeTitle: "स्थिति: असत्यापित (समीक्षा जारी)",
      reviewNoticeDesc: "आपका अवलोकन NEXUS-NER फील्ड अधिकारियों की जांच हेतु कतारबद्ध है। सत्यापन से पहले यह काफिले के मार्ग को प्रभावित नहीं करेगा।",
      categoryLabel: "श्रेणी",
      severityLabel: "अनुमानित गंभीरता",
      coordsLabel: "निर्देशांक",
      viewMyReportsBtn: "मेरी रिपोर्टें देखें",
      submitAnotherBtn: "अन्य रिपोर्ट सबमिट करें",
    },
    myReports: {
      title: "मेरी सबमिट की गई रिपोर्टें",
      subtitle: "आपके द्वारा दी गई सड़क खतरों की सूचनाओं की सत्यापन स्थिति ट्रैक करें।",
      refreshBtn: "रीफ्रेश",
      newReportBtn: "नई रिपोर्ट",
      statusVerified: "सत्यापित — घटना सक्रिय",
      statusRejected: "खारिज की गई",
      statusUnverified: "असत्यापित (समीक्षाधीन)",
      emptyTitle: "कोई सबमिट की गई रिपोर्ट नहीं मिली",
      emptyDesc: "आपने अभी तक किसी सड़क खतरे की सूचना नहीं दी है। सड़क पर कुछ देखा?",
      reportHazardBtn: "सड़क खतरे की रिपोर्ट करें",
      reviewerFeedback: "समीक्षक की टिप्पणी",
      linkedIncident: "आधिकारिक घटना से जुड़ी: #{id}",
      activeInRiskEngine: "जोखिम इंजन में सक्रिय",
      corridorLabel: "कॉरिडोर",
      submittedOn: "सबमिट समय: {date}",
    },
    auth: {
      loginTitle: "NEXUS-NER में साइन इन करें",
      loginSubtitle: "स्वायत्त लॉजिस्टिक्स एवं आपातकालीन आपूर्ति सुदृढ़ता प्लेटफॉर्म",
      registerTitle: "नागरिक खाता बनाएं",
      registerSubtitle: "पूर्वोत्तर में सड़क खतरों की रिपोर्टिंग हेतु समुदाय से जुड़ें",
      tabLogin: "साइन इन",
      tabRegister: "पंजीकरण",
      usernameLabel: "उपयोगकर्ता नाम (Username)",
      usernamePlaceholder: "अपना यूजरनेम दर्ज करें",
      emailLabel: "ईमेल पता",
      emailPlaceholder: "अपना ईमेल दर्ज करें",
      passwordLabel: "पासवर्ड",
      passwordPlaceholder: "अपना पासवर्ड दर्ज करें",
      confirmPasswordLabel: "पासवर्ड की पुष्टि करें",
      confirmPasswordPlaceholder: "पासवर्ड पुनः दर्ज करें",
      demoRolesLabel: "डेमो क्रेडेंशियल त्वरित-भरें",
      roleAdmin: "व्यवस्थापक (Admin)",
      roleOperator: "ऑपरेटर",
      roleFieldOfficer: "अधिकारी",
      roleDriver: "चालक (Driver)",
      rolePublic: "नागरिक (Public)",
      loginSubmitBtn: "प्लेटफॉर्म में प्रवेश करें",
      registerSubmitBtn: "नागरिक खाता बनाएं",
      authenticating: "प्रमाणीकरण जारी...",
      unauthorizedTitle: "पहुंच प्रतिबंधित है",
      unauthorizedDesc: "इस पोर्टल का उपयोग करने के लिए आपके खाते में पर्याप्त अनुमति नहीं है।",
      returnHomeBtn: "कंट्रोल सेंटर पर लौटें",
      signOutBtn: "साइन आउट करें और खाता बदलें",
      registering: "पंजीकरण जारी...",
      platformSubtitle: "पूर्वोत्तर क्षेत्र लॉजिस्टिक्स आसूचना और सुरक्षा मंच",
      footerInfo: "स्मार्ट इंडिया हैकाथॉन 2026 • SIH-NER • एंटरप्राइज RBAC संरक्षित",
      http403Forbidden: "HTTP 403 वर्जित (Forbidden)",
      authenticatedAccount: "प्रमाणित खाता:",
      activeRole: "सक्रिय भूमिका:",
      rbacNotice: "भूमिका-आधारित अभिगम नियंत्रण (RBAC) इस परिचालन इंटरफ़ेस को केवल अधिकृत भूमिकाओं तक सीमित करता है।",
      viewRoadRiskBtn: "सार्वजनिक सड़क जोखिम देखें",
      returnMissionCockpitBtn: "मिशन कॉकपिट पर वापस जाएं",
      returnFieldReportsBtn: "फील्ड रिपोर्ट पर वापस जाएं",
      returnControlTowerBtn: "कंट्रोल टॉवर पर वापस जाएं",
    },
    network: {
      offlineMode: "ऑफलाइन मोड",
      noInternet: "इंटरनेट उपलब्ध नहीं",
      pendingOutbox: "आउटबॉक्स लंबित",
      syncNow: "अभी सिंक करें",
      syncing: "सिंकिंग जारी...",
      online: "ऑनलाइन",
      offlineOutboxClear: "ऑफलाइन आउटबॉक्स खाली है",
      autoSyncActive: "स्वतः-सिंक सक्रिय",
      mapDegraded: "मानचित्र दृश्य बाधित",
      mapRetry: "मानचित्र पुनः लोड करें",
    },
    modelInfo: {
      title: "पूर्वानुमानित सड़क जोखिम एआई मॉडल",
      subtitle: "Scikit-Learn रैंडम फॉरेस्ट क्लासिफायर आर्किटेक्चर",
      versionLabel: "मॉडल संस्करण",
      modelTypeLabel: "आर्किटेक्चर प्रकार",
      featuresLabel: "इनपुट फीचर संख्या",
      accuracyLabel: "मान्य सटीकता (Accuracy)",
      sihDeclarationTitle: "स्मार्ट इंडिया हैकाथॉन पारदर्शिता घोषणा",
      sihDeclarationDesc: "जीवन-सुरक्षा से जुड़े काफिले के रूटिंग में भौतिक सुरक्षा नियम एआई पूर्वानुमानों से सर्वोपरि रहते हैं।",
      closeBtn: "बंद करें",
    },
    shap: {
      title: "TreeSHAP फीचर योगदान विश्लेषण",
      subtitle: "कॉरिडोर जोखिम वर्गीकरण की स्थानीय व्याख्यात्मकता",
      positiveImpact: "मॉडल आउटपुट बढ़ाने वाले कारक (+φ)",
      negativeImpact: "मॉडल आउटपुट घटाने वाले कारक (-φ)",
      baseValue: "मॉडल बेसलाइन प्रारंभिक मान",
      modelPrediction: "अंतिम मॉडल आउटपुट",
      exactLabel: "सटीक मान",
      narrativeTitle: "योगदान सारांश",
      closeBtn: "पूर्ण",
      probabilitySpace: "संभाव्यता-स्पेस",
      featureAnalysisFor: "{roadName} के लिए फीचर योगदान विश्लेषण",
      baselineSub: "प्रशिक्षण वितरण में E[f(x)]",
      operationalThreshold: "परिचालन सीमा",
      decisionBoundary: "कैलिब्रेटेड निर्णय सीमा",
      disruptionLikely: "व्यवधान की संभावना",
      disruptionUnlikely: "व्यवधान असंभव",
      methodologyTitle: "गैर-कारण सांख्यिकीय योगदान:",
      methodologyDesc: "SHAP (SHapley Additive exPlanations) यह मापता है कि किन विशेषताओं ने मॉडल के पूर्वानुमान को बेसलाइन से विचलित किया। यह प्रशिक्षण डेटा में सीखे गए सांख्यिकीय संबंधों को दर्शाता है; यह भौतिक कार्य-कारण को सिद्ध नहीं करता।",
      noPositiveFactors: "जोखिम संभावना बढ़ाने वाला कोई महत्वपूर्ण कारक नहीं मिला।",
      noNegativeFactors: "जोखिम कम करने वाला कोई महत्वपूर्ण कारक नहीं मिला।",
      additiveConsistency: "सटीक योगात्मक संगति सत्यापित",
      footerInfo: "कैश किए गए सिंगलटन के माध्यम से इन-प्रोसेस गणना की गई TreeSHAP व्याख्याएं",
      factorsCount: "{count} कारक",
    },
    predictiveRisk: {
      cardTitle: "एआई पूर्वानुमानित सड़क जोखिम",
      cardSub: "एमएल रैंडम फॉरेस्ट एवं पर्यावरणीय टेलीमेट्री",
      mlModelTitle: "रैंडम फॉरेस्ट क्लासिफायर",
      disruptionLikelihood: "व्यवधान की संभावना",
      thresholdLabel: "चेतावनी सीमा",
      explainShapBtn: "SHAP व्याख्या देखें",
      modelDetailsBtn: "मॉडल आर्किटेक्चर",
      topFactorsTitle: "प्रमुख योगदानकर्ता कारक",
    },
  },

  as: {
    nav: {
      controlTower: "নিয়ন্ত্ৰণ কক্ষ",
      fieldReport: "ক্ষেত্ৰ প্ৰতিবেদন",
      alerts: "সতৰ্কবাৰ্তা",
      routes: "পথ পৰিকল্পনা",
      incidents: "ঘটনাসমূহ",
      vehicles: "যান-বাহন",
      roads: "পথৰ বিপদাশংকা",
      analytics: "বিশ্লেষণ (Analytics)",
      reportProblem: "বিঘিনি জনাওক",
      myReports: "মোৰ প্ৰতিবেদন",
      live: "সক্ৰিয় (Live)",
      polling: "পলিং (Polling)",
      online: "অনলাইন",
      offlineMode: "অফলাইন ম'ড",
      gpsLocked: "GPS স্থিৰ",
      gpsReady: "GPS সাজু",
      searchPlaceholder: "সন্ধান কৰক...",
      logout: "প্ৰস্থান কৰক",
      notifications: "জাননীসমূহ",
      clearNotifications: "সকলো মচক",
      noNotifications: "কোনো নতুন জাননী নাই",
      switchTheme: "থীম সলনি কৰক",
      lightMode: "লাইট ম'ড",
      darkMode: "ডাৰ্ক ম'ড",
      settings: "ছেটিংছ",
      operations: "কাৰ্যপ্ৰণালী",
      systemOperational: "ব্যৱস্থা কাৰ্যক্ষম",
      allServicesRunning: "সকলো সেৱা সক্ৰিয়",
    },
    common: {
      refresh: "নতুনকৈ লওক (Refresh)",
      refreshing: "লৈ থকা হৈছে...",
      filter: "ফিল্টাৰ",
      clear: "পৰিষ্কাৰ কৰক",
      close: "বন্ধ কৰক",
      cancel: "বাতিল কৰক",
      save: "সংৰক্ষণ কৰক",
      saving: "সংৰক্ষণ চলি আছে...",
      submit: "দাখিল কৰক",
      submitting: "দাখিল হৈ আছে...",
      search: "সন্ধান কৰক",
      export: "ৰপ্তানি",
      view: "চাওক",
      inspect: "পৰীক্ষা কৰক",
      delete: "মচক",
      edit: "সম্পাদনা কৰক",
      back: "উভতি যাওক",
      next: "পৰৱৰ্তী",
      previous: "পূৰ্বৱৰ্তী",
      loading: "লোড হৈ আছে...",
      error: "ত্ৰুটি",
      success: "সফল",
      retry: "পুনৰ চেষ্টা কৰক",
      all: "সকলো",
      actions: "পদক্ষেপ",
      status: "স্থিতি",
      severity: "গুৰুত্ব",
      date: "তাৰিখ",
      time: "সময়",
      location: "স্থান",
      corridor: "পথ সংযোগী (Corridor)",
      coordinates: "স্থানাংক",
      riskScore: "বিপদাশংকা নম্বৰ",
      confidence: "বিশ্বাসযোগ্যতা",
      assigned: "নিযুক্ত",
      unassigned: "অনিযুক্ত",
      online: "অনলাইন",
      offline: "অফলাইন",
      verified: "প্ৰমাণিত",
      unverified: "অপ্ৰমাণিত",
      rejected: "প্ৰত্যাখ্যাত",
      active: "সক্ৰিয়",
      resolved: "সমাধান হ'ল",
      critical: "সংকটজনক (Critical)",
      high: "উচ্চ (High)",
      medium: "মধ্যম (Medium)",
      low: "নিম্ন (Low)",
      normal: "স্বাভাৱিক",
      details: "বিৱৰণ",
      showing: "প্ৰদৰ্শন কৰা হৈছে",
      noDataFound: "কোনো তথ্য পোৱা নগ'ল",
      unit: "গাড়ী নম্বৰ",
      speed: "গতিবেগ",
      eta: "সম্ভাৱ্য সময়",
      distance: "দূৰত্ব",
      duration: "সময়সীমা",
      minutes: "মিনিট",
      hours: "ঘণ্টা",
      km: "কিমি",
      kmh: "কিমি/ঘণ্টা",
      total: "সৰ্বমুঠ",
      incident: "ঘটনা",
      risk: "বিপদ",
      reported: "নথিভুক্ত",
    },
    dashboard: {
      controlCentralTitle: "NEXUS-NER কেন্দ্ৰীয় নিয়ন্ত্ৰণ কক্ষ",
      dispatchTerminal: "গুৱাহাটী আঞ্চলিক প্ৰেৰণ কেন্দ্ৰ",
      geofencingActive: "PostGIS জিয়'ফেন্সিং সক্ৰিয়",
      citizenReports: "ৰাইজৰ খবৰ:",
      unverifiedReports: "অপ্ৰমাণিত",
      verifiedReports: "প্ৰমাণিত",
      rejectedReports: "বাতিল",
      telemetrySynced: "টেলিমেট্ৰী সংমিশ্ৰিত",
      backendOffline: "বেকএণ্ড অফলাইন",
      autoRefresh: "সক্ৰিয় • ৩০ ছেকেণ্ডৰ মূৰে মূৰে আপডেট",
      postgisLive: "PostGIS লাইভ",
      criticalDisruptionActive: "সংকটজনক পথ বিঘিনি সক্ৰিয়",
      incidentStatus: "ঘটনা #{id} • স্থিতি: {status}",
      executeDynamicDetour: "বিকল্প পথ গ্ৰহণ কৰক →",
      inspectIncident: "ঘটনা পৰীক্ষা কৰক →",
      causalChainTitle: "পৰিচালন প্ৰভাৱ শৃংখল (Causal Chain)",
      interactiveGraph: "পাৰস্পৰিক টেলিমেট্ৰী চিত্ৰ",
      roadNode: "পথ #{id}",
      riskNode: "বিপদ: {score}",
      alertActiveNode: "সতৰ্কবাৰ্তা সক্ৰিয়",
      vehicleNode: "বাহন {number}",
      tripNode: "যাত্ৰা #{id}",
      activeConvoysTitle: "সক্ৰিয় কনভয়",
      activeConvoysSub: "নিৰীক্ষণাধীন যোগান বাহিনী",
      disruptionsTitle: "পথৰ বিঘিনি",
      disruptionsSub: "সক্ৰিয় সতৰ্কবাৰ্তা",
      criticalAlertsTitle: "সংকটজনক সতৰ্কবাৰ্তা",
      criticalAlertsSub: "জৰুৰী হস্তক্ষেপ প্ৰয়োজন",
      roadRiskTitle: "পথৰ বিপদাশংকা সূচক",
      roadRiskSub: "আঞ্চলিক পথৰ গড় মান",
      fleetPassable: "পথসমূহ খোলা আৰু সুচল",
      fleetAttention: "কনভয়ৰ বাবে বিকল্প পথ প্ৰয়োজন",
      safeAlternative: "সুৰক্ষিত বিকল্প পথ সক্ৰিয়",
      mapTitle: "NEXUS-NER GIS কাৰ্যক্ষম মানচিত্ৰ",
      mapSub: "ৰাষ্ট্ৰীয় ঘাইপথৰ বাস্তৱ সময়ৰ অৱস্থা আৰু বিপদৰ মানচিত্ৰ",
      mapFallback: "মানচিত্ৰ পোৱা হোৱা নাই — অফলাইন ম'ড",
      legendOrigin: "আৰম্ভণি",
      legendDestination: "গন্তব্য",
      legendTelemetry: "বাহনৰ GPS",
      legendBlocked: "সক্ৰিয় অৱৰোধ",
      threatTitle: "পথৰ বিপদ মূল্যায়ন",
      threatSub: "মেচিন লাৰ্নিং আৰু PostGIS বিশ্লেষণ",
      threatScore: "বিপদ সূচক",
      threatLevelCritical: "উচ্চ বিপদ — পথ বন্ধ হোৱাৰ সম্ভাৱনা",
      threatLevelModerate: "মধ্যম বিপদ — সাৱধানে চলাচল কৰক",
      threatLevelLow: "নিম্ন বিপদ — পথ সম্পূৰ্ণ সুৰক্ষিত",
      threatExplanation: "লাইভ বতৰ, মাটিৰ আৰ্দ্ৰতা আৰু ভূমিস্খলন চেন্সৰৰ তথ্য বিশ্লেষণ কৰি ৰেণ্ডম ফৰেষ্ট মডেলে নিৰ্ধাৰণ কৰিছে।",
      weatherTitle: "আঞ্চলিক বতৰৰ তথ্য",
      weatherSub: "উত্তৰ-পূবৰ ঘাইপথৰ উচ্চ-মানৰ বতৰৰ তথ্য",
      temp: "তাপমাত্ৰা",
      feelsLike: "অনুভৱ হোৱা তাপ",
      humidity: "আৰ্দ্ৰতা",
      rain: "বৰষুণৰ পৰিমাণ",
      rainProb: "বৰষুণৰ সম্ভাৱনা",
      wind: "বতাহৰ গতিবেগ",
      pressure: "বায়ুমণ্ডলীয় চাপ",
      visibility: "দৃশ্যমানতা",
      observedAt: "পৰ্যবেক্ষণ সময়",
      source: "উৎস",
      fleetTitle: "সক্ৰিয় বাহনৰ টেলিমেট্ৰী",
      fleetSub: "লাইভ GPS স্থানাংক, মালবস্তুৰ তথ্য আৰু গতিবিধি",
      tableColUnit: "বাহনৰ নম্বৰ",
      tableColStatus: "চলাচল স্থিতি",
      tableColLocation: "বৰ্তমান স্থানাংক",
      tableColCargo: "সামগ্ৰীৰ বিৱৰণ",
      tableColPriority: "প্ৰাথমিকতা",
      tableColTrip: "যাত্ৰা নম্বৰ",
      liveTracking: "লাইভ নিৰীক্ষণ",
      recentAlertsTitle: "শেহতীয়া সতৰ্কবাৰ্তা",
      recentAlertsSub: "স্বয়ংক্ৰিয় জিয়'ফেন্সিং সতৰ্কবাৰ্তা",
      viewAllAlerts: "সকলো বাৰ্তা চাওক",
      noAlerts: "বৰ্তমান কোনো সক্ৰিয় সতৰ্কবাৰ্তা নাই।",
    },
    driverCockpit: {
      missionActive: "সক্ৰিয় অভিযান",
      assignedVehicle: "নিযুক্ত বাহন",
      tripId: "যাত্ৰা নম্বৰ",
      corridor: "নিযুক্ত পথ",
      cargoManifest: "সামগ্ৰীৰ বিৱৰণ",
      priority: "প্ৰাথমিকতা",
      missionStatus: "অভিযান স্থিতি",
      hazardAlert: "সংকটজনক পথ বিঘিনি",
      corridorRisk: "পথ বিপদাশংকা সূচক",
      activeDetour: "সুৰক্ষিত বিকল্প পথ সক্ৰিয়",
      viewSafeRoute: "সুৰক্ষিত পথ চাওক",
      transmitGps: "লাইভ GPS প্ৰেৰণ কৰক",
      gpsTransmitting: "লাইভ GPS প্ৰেৰণ চলি আছে",
      gpsStandby: "টেলিমেট্ৰী স্থিৰ — প্ৰেৰণ হোৱা নাই",
      lastTelemetry: "শেহতীয়া প্ৰেৰিত তথ্য",
      noActiveMission: "কোনো সক্ৰিয় অভিযান নাই",
      detourRecommended: "নিয়ন্ত্ৰণ কক্ষই সুৰক্ষিত বিকল্প পথ প্ৰেৰণ কৰিছে",
      detourDescription: "সক্ৰিয় পথ বিঘিনি এৰাই চলি সুৰক্ষিত বিকল্প পথ নিৰ্ধাৰণ কৰা হৈছে",
      unassignedNotice: "বৰ্তমান আপোনাৰ টাৰ্মিনেলত কোনো বাহন নিযুক্ত কৰা হোৱা নাই। বাহন পাবলৈ নিয়ন্ত্ৰণ কক্ষৰ সৈতে যোগাযোগ কৰক।",
      noVehicleAssignedTitle: "কোনো বাহন নিযুক্ত নাই",
      noVehicleAssignedDesc: "প্ৰমাণিত চালক: {user}। কোনো বাহন নিযুক্ত কৰা নাই।",
      terminalStandby: "টাৰ্মিনেল স্থিতি: স্থিৰ / অনিযুক্ত",
      dispatchApproved: "নিয়ন্ত্ৰণ কক্ষই অনুমোদন জনাইছে",
      riskScoreLabel: "বিপদাশংকা নম্বৰ",
    },
    incidents: {
      title: "ঘটনা নিৰীক্ষণ আৰু তথ্য সংগ্ৰহ",
      subtitle: "পথৰ বিঘিনি পৰীক্ষা, সত্যাসত্য নিৰূপণ আৰু ব্যৱস্থাপনা কৰক",
      nlpButtonOpen: "AI / NLP বিশ্লেষণ সহায়ক",
      nlpButtonClose: "NLP সহায়ক বন্ধ কৰক",
      nlpTitle: "AI / NLP ঘটনা বিশ্লেষণ আৰু নিৰ্দ্ধাৰণ",
      nlpBadge: "পৰামৰ্শমূলক অন্তৰ্ভুক্তি",
      nlpDesc: "নাগৰিকৰ মেছেজ, হোৱাটছএপ বা ৰেডিঅ' বাৰ্তাৰ পৰা ঘটনা চিনাক্ত কৰক। এইবোৰ অপ্ৰমাণিত হিচাপে জমা হয় আৰু পৰীক্ষাৰ প্ৰয়োজন।",
      nlpPlaceholder: "যেনে গেংটকৰ ওচৰৰ NH-10 ত ধাৰাসাৰ বৰষুণৰ ফলত ডাঙৰ ভূমিস্খলন হৈছে। দুয়োটা লেন বন্ধ আৰু বহুতো ট্ৰাক আৱদ্ধ হৈ পৰিছে।",
      nlpAnalyzeBtn: "AI ৰ দ্বাৰা বিশ্লেষণ কৰক",
      nlpAnalyzing: "NLP বিশ্লেষণ চলি আছে...",
      nlpClear: "পৰিষ্কাৰ কৰক",
      candidateTitle: "চিনাক্ত কৰা ঘটনাৰ খচৰা",
      candidateBadge: "AI চিনাক্তকৃত — পৰীক্ষাৰ প্ৰয়োজন",
      providerLabel: "উৎস",
      typeLabel: "ঘটনাৰ প্ৰকাৰ",
      severityLabel: "গুৰুত্ব",
      confidenceLabel: "বিশ্বাসযোগ্যতা",
      corridorLabel: "পথৰ নাম",
      descLabel: "বিৱৰণ",
      locationRefLabel: "স্থানৰ চিন",
      noticeLabel: "জাননী",
      acceptCandidateBtn: "অনুমোদন কৰক আৰু ঘটনা যোগ কৰক",
      creatingBtn: "যোগ কৰি থকা হৈছে...",
      dismissCandidateBtn: "বাতিল কৰক",
      totalIncidents: "মুঠ ঘটনাসমূহ",
      totalIncidentsSub: "তথ্যকোষত সংৰক্ষিত",
      criticalHazards: "সংকটজনক বিপদ",
      criticalHazardsSub: "যাতায়াতৰ বাবে তাৎক্ষণিক ভাবুকি",
      activeBlockages: "সক্ৰিয় পথ অৱৰোধ",
      activeBlockagesSub: "বৰ্তমান বন্ধ থকা পথ",
      avgRisk: "গড় বিপদ সূচক",
      avgRiskSub: "সকলো ঘটনাৰ সামগ্ৰিক গড়",
      searchPlaceholder: "শিৰোনাম, পথ বা জিলা অনুসৰি সন্ধান কৰক...",
      filterSeverity: "গুৰুত্ব অনুসৰি বাছক",
      filterStatus: "স্থিতি অনুসৰি বাছক",
      hideTest: "পৰীক্ষামূলক তথ্য লুকুৱাওক",
      showingCount: "{total} টা ঘটনাৰ ভিতৰত {count} টা প্ৰদৰ্শিত",
      colId: "আইডি",
      colIncident: "ঘটনা",
      colCorridor: "পথ / স্থান",
      colSeverity: "গুৰুত্ব",
      colRisk: "বিপদ সূচক",
      colStatus: "স্থিতি",
      colTime: "সময়",
      colActions: "পদক্ষেপ",
      inspectBtn: "পৰীক্ষা",
      noIncidentsFound: "কোনো ঘটনা পোৱা নগ'ল।",
      modalTitle: "ঘটনাৰ বিতং পৰীক্ষা",
      modalSubtitle: "ঘটনা #{id} — পৰিচালন টেলিমেট্ৰী আৰু প্ৰভাৱ শৃংখল",
      tabOverview: "বিৱৰণ আৰু তথ্য",
      tabCausal: "প্ৰভাৱ শৃংখল (Causal)",
      tabActions: "অপাৰেটৰৰ পদক্ষেপ",
      causalTitle: "বিঘিনি প্ৰসাৰণ শৃংখল",
      causalDesc: "বিপদৰ মূল কাৰণৰ পৰা পথ, সতৰ্কবাৰ্তা, বাহন আৰু যাত্ৰাত পৰা প্ৰভাৱ।",
      operatorTitle: "প্ৰমাণীকৰণ নিয়ন্ত্ৰণ",
      operatorDesc: "প্ৰমাণিত হ'লে এই ঘটনা বিপদ ইঞ্জিনত যুক্ত হৈ বিকল্প পথ নিৰ্ধাৰণ স্বয়ংক্ৰিয়ভাৱে আৰম্ভ কৰে।",
      verifyBtn: "প্ৰমাণিত আৰু সক্ৰিয় কৰক",
      rejectBtn: "প্ৰতিবেদন বাতিল কৰক (ভুৱা খবৰ)",
      resolveBtn: "সমাপ্ত বুলি চিহ্নিত কৰক",
      rerouteBtn: "বিকল্প পথ নিৰ্ধাৰণ কৰক",
      statusUpdatedSuccess: 'ঘটনা #{id} ৰ স্থিতি সফলতাৰে "{status}" কৰা হ\'ল।',
      permissionDenied: "অনুমতি নাই: ADMIN বা CONTROL_OPERATOR পদবীৰ প্ৰয়োজন।",
    },
    vehicles: {
      title: "বাহন নিৰীক্ষণ আৰু টেলিমেট্ৰী",
      subtitle: "লাইভ GPS নিৰীক্ষণ, বাহনৰ অৱস্থা আৰু যাত্ৰা নিযুক্তি",
      totalVehicles: "মুঠ বাহনৰ সংখ্যা",
      totalVehiclesSub: "প্ৰণালীত পঞ্জীভুক্ত",
      inTransit: "পথত সক্ৰিয় (গতিশীল)",
      inTransitSub: "যাত্ৰা অব্যাহত আছে",
      delayed: "বিলম্বিত",
      delayedSub: "পথৰ বাধাৰ বাবে ৰৈ আছে",
      stoppedOffline: "বন্ধ / অফলাইন",
      stoppedOfflineSub: "স্থিৰ অথবা যোগাযোগহীন",
      searchPlaceholder: "বাহনৰ নম্বৰ, প্ৰকাৰ বা সামগ্ৰীৰে সন্ধান কৰক...",
      tabAll: "সকলো বাহন",
      tabMoving: "চলমান",
      tabDelayed: "বিলম্বিত",
      tabStopped: "বন্ধ থকা",
      tabOffline: "অফলাইন",
      tabIdle: "আজৰি (Idle)",
      colVehicle: "বাহন / নম্বৰ",
      colType: "প্ৰকাৰ",
      colStatus: "স্থিতি",
      colCargo: "সামগ্ৰীৰ বিৱৰণ",
      colPriority: "প্ৰাথমিকতা",
      colTrip: "যাত্ৰা নম্বৰ",
      colGps: "লাইভ GPS",
      colActions: "পদক্ষেপ",
      viewDetails: "বিৱৰণ চাওক",
      noVehiclesFound: "বিচৰা তথ্যৰ লগত কোনো বাহন নিমিলিল।",
      modalTitle: "বাহনৰ তথ্য পৰীক্ষা",
      unitDetails: "বাহনৰ বিৱৰণ",
      cargoDetails: "সামগ্ৰী আৰু অগ্ৰাধিকাৰ",
      telemetryDetails: "GPS আৰু টেলিমেট্ৰী স্থিতি",
      assignmentDetails: "যাত্ৰা নিযুক্তি",
      unassignedTrip: "কোনো যাত্ৰা নিযুক্ত হোৱা নাই",
      liveGpsSignal: "লাইভ সংযোগ সক্ৰিয়",
      lastSeen: "অন্তিম সংকেত",
      totalUnits: "মুঠ বাহন",
    },
    routes: {
      title: "বিকল্প পথ নিৰ্ধাৰক আৰু অনুকৰণ (Simulator)",
      subtitle: "AI দ্বাৰা চালিত সুৰক্ষিত বিকল্প পথ আৰু বিপদ এৰাই চলাৰ ব্যৱস্থা",
      calculateBtn: "পথ নিৰ্ধাৰণ কৰক",
      calculatingBtn: "গণনা চলি আছে...",
      rerouteBtn: "বিকল্প পথ মূল্যায়ন",
      reroutingBtn: "বিকল্প পথ বিচাৰি থকা হৈছে...",
      searchTrip: "আৰম্ভণি বা গন্তব্যৰে যাত্ৰা সন্ধান কৰক...",
      tripListTitle: "যাত্ৰা বাছক",
      priorityBadge: "প্ৰাথমিকতা",
      cargoBadge: "সামগ্ৰী",
      selectTripPrompt: "পথ চাবলৈ তালিকাৰ পৰা এখন যাত্ৰা বাছক।",
      noTripsFound: "কোনো যাত্ৰা পোৱা নগ'ল।",
      simulatorTitle: "যাত্ৰা অনুকৰণ ককপিট",
      speedLabel: "অনুকৰণৰ গতি",
      startSim: "অনুকৰণ আৰম্ভ কৰক",
      pauseSim: "অনুকৰণ ৰাখক",
      resetSim: "পূৰ্ব অৱস্থালৈ আনক",
      simulatingText: "পথত বাহনৰ চলাচল অনুকৰণ কৰা হৈছে...",
      mapTitle: "GIS পথ প্ৰদৰ্শন",
      mapSubActive: "বিকল্প পথ সক্ৰিয় — বন্ধ পথৰ সৈতে সুৰক্ষিত পথৰ তুলনা",
      mapSubIdle: "এখন যাত্ৰা বাছক আৰু পথ নিৰ্ধাৰণ কৰক",
      safeDetourActive: "সুৰক্ষিত বিকল্প পথ সক্ৰিয়",
      routeBlockedDelayed: "পথ অৱৰোধ — বিলম্বিত",
      routeCalculated: "পথ নিৰ্ধাৰিত হ'ল",
      offlineBanner: "মানচিত্ৰ পোৱা হোৱা নাই — অফলাইন ম'ড",
      comparisonTitle: "বিকল্প পথৰ তুলনা",
      comparisonSub: "PostGIS লম্বৱত বিকল্প পথ নিৰ্ধাৰণ",
      originalBlocked: "মূল বন্ধ হৈ থকা পথ",
      detourProposed: "প্ৰস্তাৱিত সুৰক্ষিত পথ",
      timeDelta: "সময়ৰ পাৰ্থক্য",
      distanceDelta: "দূৰত্বৰ পাৰ্থক্য",
      riskDelta: "বিপদাশংকা হ্ৰাস",
      aiTradeOffTitle: '"এইটো পথ কিয় বাছিলে?" — AI বিশ্লেষণ',
      aiTradeOffSub: "স্বয়ংক্ৰিয় বিকল্প পথ নিৰ্বাচনৰ কাৰণ",
      tradeOffText: "নূন্যতম বিপদাশংকা, পথৰ বহন ক্ষমতা আৰু সক্ৰিয় জিয়'ফেন্সিং বিপদ এৰাই চলাৰ বাবে প্ৰণালীয়ে এই পথ বাছনি কৰিছে।",
      riskAvoidance: "বিপদ এলেকা সম্পূৰ্ণভাৱে পৰিহাৰ কৰা হৈছে",
      resultTitle: "পথ নিৰ্ধাৰণৰ ফলাফল",
      distanceLabel: "দূৰত্ব",
      etaLabel: "আনুমানিক সময়",
      statusLabel: "স্থিতি",
      assignedVehicleLabel: "নিযুক্ত বাহন",
      gisBannerTitle: "বিপদ-সচেতন AI GIS ৰুটিঙ ইঞ্জিন সক্ৰিয়",
      gisBannerDesc: "PostGIS তথ্যকোষ আৰু OSRM ৰুটিঙ ইঞ্জিনৰ সৈতে সংযুক্ত। ই পথৰ বিঘিনি এৰাই সুৰক্ষিত পথ বাছি দিয়ে।",
      osrmStatus: "OSRM ৰুটিঙ ইঞ্জিন: অনলাইন",
      corridorSnapping: "পথ স্ন্যাপিং: সক্ৰিয়",
      aiRiskScoring: "AI বিপদ নিৰূপণ: লাইভ",
      hazardAvoidance: "বিপদ পৰিহাৰ: সক্ৰিয়",
    },
    alerts: {
      title: "কাৰ্যক্ষম সতৰ্কবাৰ্তা আৰু তথ্য",
      subtitle: "লাইভ বিঘিনিৰ জাননী, জিয়'ফেন্সিং উলংঘন আৰু সমাধান",
      totalAlerts: "মুঠ সতৰ্কবাৰ্তা",
      totalAlertsSub: "প্ৰণালীত নথিভুক্ত জাননী",
      criticalAlerts: "সংকটজনক জাননী",
      criticalAlertsSub: "তাৎক্ষণিক ব্যৱস্থা প্ৰয়োজন",
      highMediumAlerts: "উচ্চ / মধ্যম জাননী",
      highMediumAlertsSub: "পথ বিলম্ব আৰু বতৰৰ আগজাননী",
      activeUnresolved: "সক্ৰিয় (অমীমাংসিত)",
      activeUnresolvedSub: "বৰ্তমান সমাধান বাকী থকা",
      searchPlaceholder: "বাৰ্তা, পথ বা স্থান অনুসৰি সন্ধান কৰক...",
      filterSeverityAll: "সকলো গুৰুত্ব",
      filterStatusAll: "সকলো স্থিতি",
      statusActive: "সক্ৰিয়",
      statusAcknowledged: "অৱগত হোৱা হ'ল",
      statusResolved: "মীমাংসা কৰা হ'ল",
      acknowledgeBtn: "অৱগত হওক",
      resolveBtn: "মীমাংসা কৰক",
      acknowledgedBadge: "অৱগত",
      resolvedBadge: "মীমাংসিত",
      noAlertsFound: "বাছনি অনুসৰি কোনো বাৰ্তা নাই।",
      sourcesTitle: "তথ্যৰ উৎসসমূহ",
      sourcesSub: "সতৰ্কবাৰ্তা ব্যৱস্থাত তথ্য যোগান ধৰা উৎসসমূহ",
      sourceWeather: "IMD বতৰ আৰু বৰষুণ ৰাডাৰ",
      sourceIncident: "ক্ষেত্ৰ বিষয়া আৰু নাগৰিকৰ প্ৰতিবেদন",
      sourceGps: "বাহনৰ লাইভ জিয়'ফেন্সিং নিৰীক্ষণ",
      sourceAiModel: "পূৰ্বানুমানভিত্তিক বিপদ নিৰ্ণয়কাৰী AI মডেল",
    },
    roads: {
      title: "পথ আৰু সংযোগী বিপদ",
      subtitle: "PostGIS পথ আৰু বাস্তৱ সময়ৰ বিপদ নিৰীক্ষণ",
      totalCorridors: "মুঠ নিৰীক্ষিত পথ",
      highRiskCorridors: "উচ্চ বিপদ সংকুল পথ",
      accessibleCorridors: "সুচল (খোলা) পথ",
      avgNetworkRisk: "সামগ্ৰিক গড় বিপদাশংকা",
      searchPlaceholder: "পথৰ নাম, ঘাইপথ বা জিলা অনুসৰি সন্ধান কৰক...",
      colCorridor: "পথ / অংশ",
      colHighway: "ৰাষ্ট্ৰীয় ঘাইপথ",
      colRegion: "অঞ্চল / ৰাজ্য",
      colRiskLevel: "বিপদৰ মাত্ৰা",
      colProbability: "বিঘিনিৰ সম্ভাৱনা",
      colStatus: "স্থিতি",
      inspectRiskBtn: "বিপদ পৰীক্ষা",
      noRoadsFound: "কোনো পথ পোৱা নগ'ল।",
      statusOpen: "খোলা আছে",
      statusRestricted: "নিয়ন্ত্ৰিত",
      statusUnderRepair: "মেৰামতি চলি আছে",
      statusBlocked: "অৱৰুদ্ধ (বন্ধ)",
      modalTitle: "পথৰ বিপদ বিশ্লেষণ",
      modalSub: "AI মডেল মূল্যায়ন আৰু পৰিচালন নিয়ন্ত্ৰণ",
      riskScore: "বিপদাশংকা নম্বৰ",
      treeShapAttributions: "TreeSHAP কাৰকৰ প্ৰভাৱ",
      deterministicFactors: "প্ৰত্যক্ষ বিপদ সূচক",
      overrideStatusTitle: "অপাৰেটৰৰ স্থিতি নিৰ্ধাৰণ",
      overrideStatusDesc: "GIS ৰুটিঙ ব্যৱস্থাত পথৰ যাতায়াতৰ উপলব্ধতা স্থিতি সলনি কৰক।",
      saveStatusBtn: "স্থিতি নিশ্চিত কৰক",
      updatingStatus: "আপডেট চলি আছে...",
      aiPowered: "এআই চালিত",
      refreshRisk: "বিপদ সতেজ কৰক",
      engineTitle: "ভবিষ্যদ্বাণীমূলক প্ৰৱেশগম্যতা ইঞ্জিন",
      engineDesc: "বিপদ স্কোৰসমূহে ভূখণ্ডৰ বৈশিষ্ট্য, ঐতিহাসিক ঘটনা, পথৰ অৱস্থা আৰু বিঘিনিৰ সংকেতসমূহ একত্ৰিত কৰি সাম্ভাব্য পৰিবহণ প্ৰভাৱ নিৰ্ণয় কৰে।",
      modelStatus: "মডেলৰ স্থিতি",
      operational: "কাৰ্যক্ষম (সক্ৰিয়)",
      immediateAction: "অবিলম্বে ব্যৱস্থা গ্ৰহণ",
      closelyMonitor: "সতৰ্কভাৱে নিৰীক্ষণ কৰক",
      monitorConditions: "অৱস্থা নিৰীক্ষণ কৰক",
      normalOperations: "স্বাভাৱিক চলাচল",
      mapTitle: "বিপদ বিতৰণ মানচিত্ৰ",
      mapSub: "উত্তৰ-পূৰ্বাঞ্চলত পূৰ্বানুমান কৰা বিঘিনি হটস্পট",
      highestRiskTitle: "সৰ্বাধিক বিপদজনক কৰিডৰ",
      highestRiskSub: "অপাৰেটৰ পৰ্যালোচনাৰ বাবে অগ্ৰাধিকাৰ অঞ্চল",
      riskScoreRatio: "বিপদ স্কোৰ / ১০০",
      viewAnalysis: "বিপদ বিশ্লেষণ চাওক",
      tableTitle: "পথ বিপদ মূল্যায়ন",
      tableSub: "নজৰদাৰী কৰা পথ খণ্ডসমূহৰ বাবে এআই-উৎপন্ন বিপদ স্কোৰ",
      segmentsCount: "{count} টা খণ্ড",
      colHazard: "বিপদ",
      colConfidence: "এআই আত্মবিশ্বাস",
      aiPrediction: "এআই পূৰ্বানুমান",
      aiPredictionSub: "মেচিন লাৰ্নিং বিপদ স্কোৰিং",
      aiPredictionDesc: "ঐতিহাসিক ভূমিস্খলন আৰু পথৰ অৱস্থাৰ ধাৰাসমূহক বৰ্তমান সংকেতৰ সৈতে একত্ৰিত কৰি বিঘিনিৰ সম্ভাৱনা নিৰূপণ কৰা হয়।",
      weatherSignals: "বতৰৰ সংকেত",
      weatherSignalsSub: "বৰষুণ আৰু পাৰিপাৰ্শ্বিক অৱস্থা",
      weatherSignalsDesc: "বতৰৰ অৱস্থাই বানপানী, ভূমিস্খলন আৰু পথৰ যোগাযোগ ব্যাহত হোৱাৰ সম্ভাৱনা বৃদ্ধি কৰিব পাৰে।",
      roadCondition: "পথৰ অৱস্থা",
      roadConditionSub: "পৃষ্ঠ আৰু প্ৰৱেশগম্যতা সূচক",
      roadConditionDesc: "পৃষ্ঠৰ গুণমান, মসৃণতা, ভূখণ্ড আৰু ঐতিহাসিক ঘটনাই দুৰ্বল পৰিবহণ পথসমূহ চিনাক্ত কৰাত সহায় কৰে।",
      hazardType: "বিপদৰ প্ৰকাৰ",
      material: "সামগ্ৰী",
      surface: "পৃষ্ঠ",
      notAvailable: "উপলব্ধ নহয়",
      aiRecommendation: "এআই পৰামৰ্শ",
      aiRecommendationDesc: "এই পথত বিপদৰ মাত্ৰা বৃদ্ধি পাই থাকিলে বিকল্প পথ ব্যৱহাৰ আৰু নিৰীক্ষণ বৃদ্ধিৰ কথা বিবেচনা কৰক।",
      operatorControlTitle: "অপাৰেটৰ কৰিডৰ স্থিতি নিয়ন্ত্ৰণ",
      roleLabel: "ভূমিকা",
      operatorControlDesc: "নেটৱৰ্ক বিপদ সমন্বয় আৰু ভৱিষ্যদ্বাণী মডেল পুনৰ গণনা কৰিবলৈ লাইভ কৰিডৰৰ কাৰ্যক্ষম স্থিতি আপডেট কৰক।",
    },
    analytics: {
      title: "যোগান আৰু বিপদ বিশ্লেষণ (Analytics)",
      subtitle: "বাহনৰ কাৰ্যক্ষমতা, বিঘিনিৰ হাৰ আৰু পথৰ স্থিৰতাৰ পৰিসংখ্যা",
      timeRange: "সময়ৰ পৰিসৰ",
      last24h: "যোৱা ২৪ ঘণ্টা",
      last7d: "যোৱা ৭ দিন",
      last30d: "যোৱা ৩০ দিন",
      lastQuarter: "যোৱা ৩ মাহ",
      routesCompleted: "সম্পূৰ্ণ হোৱা যাত্ৰা",
      routesCompletedSub: "নিৰ্বাচিত সময়ত সফল যাত্ৰা",
      avgEta: "গড় যাত্ৰাৰ সময়",
      avgEtaSub: "স্বাভাৱিক যাত্ৰাৰ সময়সীমা",
      activeVehicles: "সক্ৰিয় বাহন",
      activeVehiclesSub: "তথ্য প্ৰেৰণ কৰি থকা বাহন",
      accessibilityRate: "পথৰ উপলব্ধতাৰ হাৰ",
      accessibilityRateSub: "খোলা পথৰ ক্ষমতা",
      incidentTrendTitle: "দিন অনুসৰি ঘটনাৰ সংখ্যা",
      incidentTrendSub: "বাছনি কৰা সময়ত পথ বিঘিনিৰ গতিবিধি",
      deliveryTrendTitle: "যাত্ৰা সময়ৰ তাৰতম্য (ঘণ্টা)",
      deliveryTrendSub: "প্ৰকৃত সময় বনাম নিৰ্ধাৰিত সময়",
      regionalTitle: "আঞ্চলিক কাৰ্যকলাপৰ বিতৰণ",
      regionalSub: "উত্তৰ-পূবৰ ৰাজ্যসমূহৰ সক্ৰিয় বাহন আৰু ঘটনা",
      riskDistTitle: "পথৰ বিপদ বিতৰণ",
      riskDistSub: "বিপদ শ্ৰেণী অনুসৰি ঘাইপথৰ অনুপাত",
      corridorTableTitle: "গুৰুত্বপূৰ্ণ ৰাষ্ট্ৰীয় ঘাইপথসমূহ",
      corridorTableSub: "প্ৰধান পথসমূহৰ কাৰ্যক্ষমতা আৰু উপলব্ধতাৰ পৰিসংখ্যা",
      insightsTitle: "পৰিচালন AI অন্তৰ্দৃষ্টি",
      insight1: "ধেমাজি জিলাত নেৰানেপেৰা বৰষুণৰ বাবে NH-15 পথত বিপদৰ সম্ভাৱনা বৃদ্ধি পাইছে।",
      insight2: "NH-27 বিকল্প পথে যাত্ৰাৰ সময় গড়ে ৪২ মিনিট ৰেহাই কৰিছে।",
      insight3: "বাহন ব্যৱহাৰৰ হাৰ বৰ্তমান ৮৫% ত আছে আৰু কোনো সমাধান নোহোৱা জৰুৰী জাননী নাই।",
      fleetUtilization: "বাহনৰ ব্যৱহাৰৰ হাৰ",
      routeSafety: "যাত্ৰাপথৰ সুৰক্ষা সূচক",
      incidentResolution: "ঘটনা সমাধানৰ হাৰ",
      footerTitle: "বিশ্লেষণমূলক তথ্য",
      footerDesc: "উত্তৰ-পূব অঞ্চলৰ বাহন টেলিমেট্ৰি, পৰীক্ষিত ঘটনা, পথ-বিপদ মূল্যায়ন, যাত্ৰাপথৰ ইতিহাস আৰু আঞ্চলিক যোগান কাৰ্যকলাপৰ পৰা গণনা কৰা লাইভ পৰিচালন বিশ্লেষণ।",
      totalMonitoredRoads: "মুঠ নিৰীক্ষিত পথ",
      safeLowRisk: "সুৰক্ষিত / কম বিপদ",
    },
    fieldReport: {
      title: "ক্ষেত্ৰ প্ৰতিবেদন",
      subtitle: "ক্ষেত্ৰৰ পৰা জিঅ'-টেগযুক্ত পথ আৰু দুৰ্ঘটনা প্ৰতিবেদন দাখিল কৰক",
      languageLabel: "ভাষা",
      outboxActiveTitle: "স্থান আৰু অফলাইন আউটবক্স সক্ৰিয়",
      outboxActiveDesc: "কম নেটৱৰ্ক থকা অঞ্চলত কৰা প্ৰতিবেদনসমূহ স্থানীয়ভাৱে সুৰক্ষিত অফলাইন SQLite/IDB আউটবক্সত সংৰক্ষিত হয়। নেটৱৰ্ক ঘূৰি আহিলে সেইবোৰ স্বয়ংক্ৰিয়ভাৱে POST /sync/batch যোগে সংমিশ্ৰিত হ'ব।",
      pendingOutboxBadge: "আউটবক্সত বাকী আছে",
      syncNowBtn: "এতিয়াই আউটবক্স সংমিশ্ৰণ কৰক",
      syncingBtn: "সংমিশ্ৰণ চলি আছে...",
      allSynced: "আউটবক্স খালী — সকলো প্ৰতিবেদন সংমিশ্ৰিত হৈছে",
      formTitle: "ঘটনাৰ বিৱৰণ",
      formSubtitle: "বাস্তৱ সময়ৰ পথ চলাচলৰ বিঘিনি লিপিবদ্ধ কৰক",
      incidentTypeLabel: "ঘটনাৰ প্ৰকাৰ",
      selectTypePrompt: "ঘটনাৰ শ্ৰেণীবিভাজন বাছক...",
      typeLandslide: "ভূমিস্খলন",
      typeFlood: "বানপানী / পানী জমা",
      typeRoadBlockage: "পথ অৱৰোধ",
      typeRoadDamage: "পথৰ ক্ষতিসাধন",
      typeWeatherDisruption: "বতৰৰ ব্যাঘাত",
      typeOther: "অন্যান্য ব্যাঘাত",
      severityLabel: "গুৰুত্বৰ মাত্ৰা",
      sevCritical: "সংকটজনক (Critical)",
      sevHigh: "উচ্চ (High)",
      sevMedium: "মধ্যম (Medium)",
      sevLow: "নিম্ন (Low)",
      descriptionLabel: "ক্ষেত্ৰ পৰ্যবেক্ষণ আৰু বিৱৰণ",
      descriptionPlaceholder: "পথৰ অৱস্থা, ক্ষতিগ্ৰস্ত অংশ, যান-বাহন চলাচলৰ ক্ষমতা বা সম্ভাৱ্য নিষ্কাষণ সময়ৰ বিৱৰণ দিয়ক...",
      locationLabel: "স্থানৰ নাম / চিহ্ন",
      locationNamePlaceholder: "যেনে যোৰাবাটৰ ওচৰৰ NH-27, ৪২ কিমি চিহ্ন",
      latitudeLabel: "অক্ষৰেখা (Latitude)",
      longitudeLabel: "দ্ৰাঘিমাৰেখা (Longitude)",
      useGpsBtn: "GPS অৱস্থান সংগ্ৰহ কৰক",
      locatingBtn: "সংগ্ৰহ চলি আছে...",
      nerPresetsLabel: "উত্তৰ-পূব প্ৰিচেট",
      presetGuwahati: "গুৱাহাটী (NH-27)",
      presetShillong: "শ্বিলং (NH-6)",
      presetTezpur: "তেজপুৰ (NH-15)",
      presetGangtok: "গেংটক (NH-10)",
      photoLabel: "দৃশ্যমান প্ৰমাণ / ফটো (ঐচ্ছিক)",
      takePhotoBtn: "কেমেৰাৰে ফটো তোলক",
      photoGalleryBtn: "গেলেৰীৰ পৰা বাছক",
      photoAttachedText: "ফটো তোলা হ'ল আৰু স্থানীয় অফলাইন ষ্টোৰেজত সংৰক্ষিত কৰা হ'ল",
      removePhotoBtn: "প্ৰমাণ আঁতৰাওক",
      submitReportBtn: "ক্ষেত্ৰ প্ৰতিবেদন দাখিল কৰক",
      submittingBtn: "দাখিল হৈ আছে...",
      saveDraftBtn: "খচৰা স্থানীয়ভাৱে সাঁচক",
      savingDraftBtn: "সঁচি থকা হৈছে...",
      errSelectType: "অনুগ্ৰহ কৰি দাখিল কৰাৰ আগতে ঘটনাৰ প্ৰকাৰ বাছক।",
      errInvalidCoords: "অনুগ্ৰহ কৰি বৈধ সংখ্যাসূচক GPS স্থানাংক দিয়ক।",
      errOutsideNer: "স্থানাংক উত্তৰ-পূব অঞ্চলৰ সীমা [২০-৩০° উত্তৰ, ৮৮-৯৮° পূব]ৰ বাহিৰত।",
      draftSavedSuccess: "খচৰা স্থানীয়ভাৱে অফলাইন ভঁৰালত সংৰক্ষণ কৰা হ'ল।",
      reportQueuedOffline: "অফলাইন — প্ৰতিবেদন স্থানীয় আউটবক্সত সংৰক্ষিত হ'ল (PENDING)। নেটৱৰ্ক পোৱাৰ লগে লগে স্বয়ংক্ৰিয়ভাৱে সংমিশ্ৰিত হ'ব।",
      reportSyncingOnline: "প্ৰতিবেদন ক্ৰমবদ্ধ হ'ল। নিয়ন্ত্ৰণ কক্ষৰ সৈতে সংমিশ্ৰণ চলি আছে...",
      reportSyncedSuccess: "প্ৰতিবেদন নিয়ন্ত্ৰণ কক্ষৰ সৈতে সফলতাৰে সংমিশ্ৰিত হ'ল।",
      reportEnqueuedRetry: "প্ৰতিবেদন আউটবক্সত সংৰক্ষিত। সংমিশ্ৰণ স্বয়ংক্ৰিয়ভাৱে পুনৰ চেষ্টা কৰা হ'ব।",
      aiAssistantTitle: "AI/NLP ঘটনা নিষ্কাশন সহায়ক",
      aiAssistantSubtitle: "অসংগঠিত পাঠৰ পৰা প্ৰতিবেদনৰ খচৰা তৈয়াৰ কৰক",
      aiInputPlaceholder: "ক্ষেত্ৰৰ টোকা, নাগৰিকৰ খবৰ বা ৰেডিঅ' বাৰ্তা ইয়াত পেষ্ট কৰক (যেনে 'গুৱাহাটী আৰু তেজপুৰৰ মাজৰ NH-27ত ভূমিস্খলন হোৱাৰ খবৰ...')...",
      aiExtractBtn: "AIৰ দ্বাৰা ঘটনা চিনাক্ত কৰক",
      aiExtractingBtn: "বিশ্লেষণ চলি আছে...",
      aiApplyDraftBtn: "উদ্ধাৰ কৰা খচৰা ফৰ্মত প্ৰয়োগ কৰক",
      aiDisclaimer: "AI-উদ্ধাৰ কৰা খচৰা — দাখিল কৰাৰ আগতে ক্ষেত্ৰ বিষয়াৰ দ্বাৰা সত্যতা নিৰূপণ প্ৰয়োজন।",
      aiConfidence: "বিশ্বাসযোগ্যতা",
      aiProvider: "প্ৰদানকাৰী",
      recentReportsTitle: "শেহতীয়া ক্ষেত্ৰ প্ৰতিবেদন",
      recentReportsSubtitle: "শেহতীয়াকৈ ক্ৰমবদ্ধ আৰু দাখিল কৰা প্ৰতিবেদনসমূহ",
      totalReportsCount: "সৰ্বমুঠ",
      statusVerified: "প্ৰমাণিত",
      statusPendingSync: "সংমিশ্ৰণ বাকী",
      statusDraft: "স্থানীয় খচৰা",
      noReportsYet: "এতিয়ালৈকে কোনো ক্ষেত্ৰ প্ৰতিবেদন নথিভুক্ত হোৱা নাই।",
      publicQueueTitle: "নাগৰিকৰ বিপদ প্ৰতিবেদন (পৰীক্ষাৰ তালিকা)",
      publicQueueSub: "বিষয়াৰ অনুমোদনৰ বাবে অপেক্ষাৰত ৰাজহুৱা তথ্যসমূহ",
      verifyPublicBtn: "ঘটনা হিচাপে অনুমোদন কৰক",
      rejectPublicBtn: "প্ৰতিবেদন নাকচ কৰক",
      reviewNotesPlaceholder: "পৰীক্ষামূলক টোকা (ঐচ্ছিক)...",
      aiVerificationTitle: "AI সত্যাপন",
      aiVerificationSub: "স্বয়ংক্ৰিয় ঘটনা সত্যাপন",
      verificationPipeline: "সত্যাপন পাইপলাইন",
      processingSubmission: "দাখিল প্ৰক্ৰিয়াকৰণ চলি আছে...",
      readyForReport: "ক্ষেত্ৰ প্ৰতিবেদনৰ বাবে সাজু",
      imageEvidence: "ছবিৰ প্ৰমাণ",
      attachedLocal: "সংলগ্ন (স্থানীয়)",
      pendingStatus: "বাকী থকা",
      locationValidation: "অৱস্থান পৰীক্ষণ",
      nerValidated: "NER প্ৰমাণিত",
      pendingGps: "GPS বাকী",
      verificationDesc: "কৰিড'ৰ সতৰ্কবাৰ্তা বৃদ্ধি কৰাৰ আগতে প্ৰতিবেদনসমূহ ভূ-অৱস্থান বিপদ মানচিত্ৰায়ন আৰু ঘটনা শ্ৰেণীবিভাজনৰ সৈতে বিশ্লেষণ কৰা হয়।",
      gpsInfoTitle: "GPS তথ্য",
      gpsInfoSub: "বৰ্তমান যন্ত্ৰৰ অৱস্থান",
      gpsStatusLabel: "স্থিতি",
      positionAcquired: "অৱস্থান সংগ্ৰহ হ'ল",
      readyOnDemand: "প্ৰয়োজন সাপেক্ষে সাজু",
      accuracyLabel: "সঠিকতা",
      lastUpdateLabel: "শেহতীয়া আপডেট",
      neverLabel: "কেতিয়াও নহয়",
      emptyPublicQueue: "শাৰীত কোনো অপ্ৰমাণিত নাগৰিক প্ৰতিবেদন বাকী নাই। সকলো পৰ্যবেক্ষণ সম্পন্ন হৈছে।",
      processingBtn: "প্ৰক্ৰিয়াকৰণ চলি আছে...",
      advisoryIngestionBadge: "পৰামৰ্শ অন্তৰ্ভুক্তিকৰণ",
      hideAssistant: "সহায়ক লুকুৱাওক",
      showAssistant: "সহায়ক দেখুৱাওক",
      takePhotoSub: "ডিভাইচত ফটো তোলক",
      uploadGallerySub: "স্থানীয় ফাইল আপলোড কৰক",
      statusPending: "বিবেচনাধীন",
    },
    publicReport: {
      portalBadge: "নাগৰিক পথ নিৰীক্ষণ প'ৰ্টেল",
      portalTitle: "নাগৰিক পথৰ অৱস্থাৰ প্ৰতিবেদন",
      portalSubtitle: "উত্তৰ-পূব অঞ্চলৰ জৰুৰী যোগান পথসমূহ সুৰক্ষিত ৰখাত NEXUS-NER ক সহায় কৰক।",
      guardrailTitle: "পৰীক্ষণ নিয়ম (প্ৰাৰম্ভিক স্থিতি: অপ্ৰমাণিত):",
      guardrailDesc: "সকলো ৰাজহুৱা প্ৰতিবেদন প্ৰথমতে অপ্ৰমাণিত হিচাপে জমা হয় আৰু বিষয়াৰ দ্বাৰা পৰীক্ষা কৰা হয়। প্ৰতিবেদন দিয়াৰ লগে লগে পথ বন্ধ হৈ নাযায়।",
      hazardCategoryLabel: "বিপদ / সমস্যাৰ শ্ৰেণী",
      impactLevelLabel: "সম্ভাব্য প্ৰভাৱৰ মাত্ৰা",
      corridorOptionalLabel: "ক্ষতিগ্ৰস্ত ঘাইপথ (ঐচ্ছিক)",
      corridorOptionalPlaceholder: "-- পথ বাছক বা খালী ৰাখক --",
      locationLabel: "অৱস্থান স্থানাংক (উত্তৰ-পূব অঞ্চল)",
      useGpsBtn: "ডিভাইচৰ GPS ব্যৱহাৰ কৰক",
      acquiringGps: "GPS লোৱা হৈছে...",
      latLabel: "অক্ষৰেখা [২০° - ৩০° উত্তৰ]",
      lonLabel: "দ্ৰাঘিমাৰেখা [৮৮° - ৯৮° পূব]",
      gpsAccuracy: "✓ ডিভাইচৰ পৰা সংগ্ৰহ কৰা হ'ল (সঠিকতা ±{acc} মিটাৰ)",
      descriptionLabel: "বিৱৰণ আৰু প্ৰত্যক্ষদৰ্শীৰ টোকা",
      descriptionPlaceholder: "আপুনি দেখা ঘটনাটো বৰ্ণনা কৰক: যেনে দলঙৰ ৫ কিমি পূবত ভূমিস্খলন হৈ দুয়োটা লেন বন্ধ। বৰষুণ হৈ আছে।",
      charCount: "{count}/২০০০",
      submitBtn: "পথৰ সমস্যা দাখিল কৰক",
      submittingBtn: "দাখিল চলি আছে...",
      successTitle: "প্ৰতিবেদন সফলতাৰে দাখিল কৰা হ'ল",
      refLabel: "প্ৰতিবেদন নম্বৰ",
      reviewNoticeTitle: "স্থিতি: অপ্ৰমাণিত (পৰীক্ষা চলি আছে)",
      reviewNoticeDesc: "আপোনাৰ প্ৰতিবেদন বিষয়াসকলে পৰীক্ষা কৰিবলৈ ক্ৰমবদ্ধ কৰা হৈছে। অনুমোদন নোহোৱালৈকে ই কনভয়ৰ যাত্ৰা পথত প্ৰভাৱ নেপেলায়।",
      categoryLabel: "শ্ৰেণী",
      severityLabel: "গুৰুত্ব",
      coordsLabel: "স্থানাংক",
      viewMyReportsBtn: "মোৰ প্ৰতিবেদনসমূহ চাওক",
      submitAnotherBtn: "আন এটা প্ৰতিবেদন দিয়ক",
    },
    myReports: {
      title: "মোৰ দাখিল কৰা প্ৰতিবেদনসমূহ",
      subtitle: "আপুনি দিয়া পথৰ বিপদ জাননীসমূহৰ সত্যাসত্যৰ অগ্ৰগতি পৰীক্ষা কৰক।",
      refreshBtn: "নতুনকৈ লওক",
      newReportBtn: "নতুন প্ৰতিবেদন",
      statusVerified: "প্ৰমাণিত — সক্ৰিয় ঘটনা",
      statusRejected: "নাকচ কৰা হ'ল",
      statusUnverified: "অপ্ৰমাণিত (বিবেচনাধীন)",
      emptyTitle: "কোনো প্ৰতিবেদন পোৱা নগ'ল",
      emptyDesc: "আপুনি এতিয়ালৈকে কোনো পথৰ বিপদৰ খবৰ দিয়া নাই। পথত কিবা অসুবিধা পাইছে নেকি?",
      reportHazardBtn: "পথৰ বিপদৰ খবৰ দিয়ক",
      reviewerFeedback: "পৰীক্ষকৰ মন্তব্য",
      linkedIncident: "আधिकारिक ঘটনাৰ লগত সংযুক্ত: #{id}",
      activeInRiskEngine: "বিপদ ইঞ্জিনত সক্ৰিয়",
      corridorLabel: "পথ",
      submittedOn: "দাখিলৰ সময়: {date}",
    },
    auth: {
      loginTitle: "NEXUS-NER লৈ প্ৰৱেশ কৰক",
      loginSubtitle: "স্বয়ংক্ৰিয় যোগান শৃংখল আৰু জৰুৰী সাহায্য ব্যৱস্থাপনা প'ৰ্টেল",
      registerTitle: "নাগৰিক একাউণ্ট খোলক",
      registerSubtitle: "উত্তৰ-পূবৰ পথৰ বিপদৰ খবৰ দিবলৈ আমাৰ লগত যোগ দিয়ক",
      tabLogin: "প্ৰৱেশ",
      tabRegister: "পঞ্জীয়ন",
      usernameLabel: "ব্যৱহাৰকাৰীৰ নাম (Username)",
      usernamePlaceholder: "ইউজাৰনেম দিয়ক",
      emailLabel: "ইমেইল ঠিকনা",
      emailPlaceholder: "ইমেইল দিয়ক",
      passwordLabel: "পাছৱৰ্ড",
      passwordPlaceholder: "পাছৱৰ্ড দিয়ক",
      confirmPasswordLabel: "পাছৱৰ্ড নিশ্চিত কৰক",
      confirmPasswordPlaceholder: "পাছৱৰ্ড পুনৰ দিয়ক",
      demoRolesLabel: "ডেমো একাউণ্ট স্বয়ংক্ৰিয়ভাৱে ভৰাওক",
      roleAdmin: "প্ৰশাসক (Admin)",
      roleOperator: "অপাৰেটৰ",
      roleFieldOfficer: "ক্ষেত্ৰ বিষয়া",
      roleDriver: "চালক (Driver)",
      rolePublic: "নাগৰিক (Public)",
      loginSubmitBtn: "প'ৰ্টেলত প্ৰৱেশ কৰক",
      registerSubmitBtn: "নাগৰিক একাউণ্ট সৃষ্টি কৰক",
      authenticating: "প্ৰমাণীকৰণ চলি আছে...",
      unauthorizedTitle: "প্ৰৱেশ নিষিদ্ধ",
      unauthorizedDesc: "এই প'ৰ্টেল ব্যৱহাৰ কৰিবলৈ আপোনাৰ একাউণ্টত প্ৰয়োজনীয় পদবীৰ অনুমতি নাই।",
      returnHomeBtn: "নিয়ন্ত্ৰণ কক্ষলৈ উভতি যাওক",
      signOutBtn: "প্ৰস্থান কৰি একাউণ্ট সলনি কৰক",
      registering: "পঞ্জীয়ন চলি আছে...",
      platformSubtitle: "উত্তৰ-পূব অঞ্চলৰ লজিষ্টিক চোৰাংচোৱা আৰু সুৰক্ষা মঞ্চ",
      footerInfo: "স্মাৰ্ট ইণ্ডিয়া হেকাথন ২০২৬ • SIH-NER • এণ্টাৰপ্ৰাইজ RBAC সুৰক্ষিত",
      http403Forbidden: "HTTP 403 নিষিদ্ধ (Forbidden)",
      authenticatedAccount: "প্ৰমাণিত একাউণ্ট:",
      activeRole: "সক্ৰিয় ভূমিকা:",
      rbacNotice: "ভূমিকা ভিত্তিক প্ৰৱেশাধিকাৰ নিয়ন্ত্ৰণে (RBAC) এই কাৰ্যকৰী আন্তঃপৃষ্ঠ কেৱল অনুমোদিত ভূমিকাসমূহৰ মাজত সীমিত ৰাখে।",
      viewRoadRiskBtn: "ৰাজহুৱা পথৰ বিপদ চাওক",
      returnMissionCockpitBtn: "মিছন ককপিটলৈ উভতি যাওক",
      returnFieldReportsBtn: "ক্ষেত্ৰ প্ৰতিবেদনলৈ উভতি যাওক",
      returnControlTowerBtn: "নিয়ন্ত্ৰণ কক্ষলৈ উভতি যাওক",
    },
    network: {
      offlineMode: "অফলাইন ম'ড",
      noInternet: "ইণ্টাৰনেট নাই",
      pendingOutbox: "আউটবক্সত জমা থকা",
      syncNow: "এতিয়াই সংমিশ্ৰণ কৰক",
      syncing: "সংমিশ্ৰণ চলি আছে...",
      online: "অনলাইন",
      offlineOutboxClear: "অফলাইন আউটবক্স খালী",
      autoSyncActive: "স্বয়ংক্ৰিয় সংমিশ্ৰণ সক্ৰিয়",
      mapDegraded: "মানচিত্ৰৰ দৃশ্যমানতা ব্যাহত",
      mapRetry: "মানচিত্ৰ পুনৰ চেষ্টা কৰক",
    },
    modelInfo: {
      title: "পূৰ্বানুমানভিত্তিক পথৰ বিপদ নিৰ্ণয়কাৰী AI মডেল",
      subtitle: "Scikit-Learn ৰেণ্ডম ফৰেষ্ট শ্ৰেণীবিভাজক আৰ্হি",
      versionLabel: "মডেলৰ সংস্কৰণ",
      modelTypeLabel: "মডেলৰ প্ৰকাৰ",
      featuresLabel: "ইনপুট কাৰকৰ সংখ্যা",
      accuracyLabel: "যাচাইকৃত সঠিকতা",
      sihDeclarationTitle: "স্মাৰ্ট ইণ্ডিয়া হেকাথন স্বচ্ছতা ঘোষণা",
      sihDeclarationDesc: "জীৱন-সুৰক্ষা আৰু কনভয়ৰ যাত্ৰাপথ নিৰ্ধাৰণত ভৌতিক সুৰক্ষা নিয়মে AI পূৰ্বানুমানতকৈ সৰ্বোচ্চ প্ৰাধান্য পায়।",
      closeBtn: "বন্ধ কৰক",
    },
    shap: {
      title: "TreeSHAP কাৰক বিশ্লেষণ",
      subtitle: "পথৰ বিপদ নিৰ্ধাৰণৰ স্থানীয় কাৰকসমূহৰ ব্যাখ্যা",
      positiveImpact: "মডেলৰ ফলাফল বৃদ্ধি কৰা কাৰকসমূহ (+φ)",
      negativeImpact: "মডেলৰ ফলাফল হ্ৰাস কৰা কাৰকসমূহ (-φ)",
      baseValue: "মডেলৰ ভিত্তি মান",
      modelPrediction: "চূড়ান্ত মডেলৰ ফলাফল",
      exactLabel: "সঠিক মান",
      narrativeTitle: "অৱদানৰ সাৰাংশ",
      closeBtn: "সমাপ্ত",
      probabilitySpace: "সম্ভাৱনীয়তা পৰিসৰ",
      featureAnalysisFor: "{roadName}ৰ বাবে কাৰক বিশ্লেষণ",
      baselineSub: "প্ৰশিক্ষণ তথ্যত E[f(x)]",
      operationalThreshold: "কাৰ্য্যকৰী সীমা",
      decisionBoundary: "নিয়ন্ত্ৰিত সিদ্ধান্ত সীমা",
      disruptionLikely: "ব্যাঘাতৰ সম্ভাৱনা",
      disruptionUnlikely: "ব্যাঘাতৰ সম্ভাৱনা নাই",
      methodologyTitle: "পৰিসাংখ্যিক কাৰক অৱদান:",
      methodologyDesc: "SHAP-এ নিৰ্ণয় কৰে যে কোনবোৰ কাৰকে মডেলৰ পূৰ্বানুমানক মূল ভিত্তিৰ পৰা সলনি কৰিছে। ই প্ৰশিক্ষণ তথ্যৰ পৰিসাংখ্যিক সম্পৰ্ক প্ৰতিফলিত কৰে; ই পোনপটীয়া ভৌতিক কাৰণ প্ৰমাণ নকৰে।",
      noPositiveFactors: "বিপদ সম্ভাৱনা বৃদ্ধি কৰা কোনো বিশেষ কাৰক নাই।",
      noNegativeFactors: "বিপদ হ্ৰাস কৰা কোনো বিশেষ কাৰক নাই।",
      additiveConsistency: "সঠিক যোগাত্মক সংগতি নিশ্চিত কৰা হৈছে",
      footerInfo: "কেচড ছিংগলটনৰ জৰিয়তে প্ৰক্ৰিয়াধীনভাৱে গণনা কৰা TreeSHAP ব্যাখ্যা",
      factorsCount: "{count}টা কাৰক",
    },
    predictiveRisk: {
      cardTitle: "AI পূৰ্বানুমানভিত্তিক পথৰ বিপদাশংকা",
      cardSub: "ML ৰেণ্ডম ফৰেষ্ট আৰু পৰিৱেশীয় টেলিমেট্ৰী",
      mlModelTitle: "ৰেণ্ডম ফৰেষ্ট ক্লাসিফায়াৰ",
      disruptionLikelihood: "বিঘিনি ঘটাৰ সম্ভাৱনা",
      thresholdLabel: "সতৰ্কবাৰ্তাৰ সীমা",
      explainShapBtn: "SHAP দ্বাৰা বুজি লওক",
      modelDetailsBtn: "মডেলৰ আৰ্হি",
      topFactorsTitle: "প্ৰধান প্ৰভাৱশালী কাৰকসমূহ",
    },
  },
};
