import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

interface SearchContext {
  rawQuery: string;
  name: string;
  city: string | null;
  country: string | null;
}

interface AmapPlace {
  id?: string;
  name?: string;
  address?: string;
  location?: string;
  pname?: string;
  cityname?: string | string[];
  adname?: string;
}

interface AmapPlaceSearchResponse {
  status: string;
  info?: string;
  pois?: AmapPlace[];
}

interface AmapGeocode {
  formatted_address?: string;
  location?: string;
  country?: string;
  province?: string;
  city?: string | string[];
  district?: string;
}

interface AmapGeocodeResponse {
  status: string;
  info?: string;
  geocodes?: AmapGeocode[];
}

interface GeocodeResult {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  displayName: string;
}

const AMAP_WEB_SERVICE_KEY =
  process.env.AMAP_WEB_SERVICE_KEY?.trim() ||
  process.env.AMAP_KEY?.trim() ||
  process.env.NEXT_PUBLIC_AMAP_WEB_SERVICE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_AMAP_KEY?.trim();
const AMAP_SECURITY_KEY =
  process.env.AMAP_WEB_SERVICE_SECURITY_KEY?.trim() ||
  process.env.AMAP_SECURITY_KEY?.trim() ||
  process.env.NEXT_PUBLIC_AMAP_WEB_SERVICE_SECURITY_KEY?.trim() ||
  process.env.NEXT_PUBLIC_AMAP_SECURITY_KEY?.trim();
const AMAP_TIMEOUT_MS = 10000;

function normalizeValue(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") || "";
}

function parseSearchContext(request: NextRequest): SearchContext | null {
  const rawQuery = normalizeValue(request.nextUrl.searchParams.get("q"));
  const explicitName = normalizeValue(request.nextUrl.searchParams.get("name"));
  const explicitCity = normalizeValue(request.nextUrl.searchParams.get("city"));
  const explicitCountry = normalizeValue(request.nextUrl.searchParams.get("country"));

  if (explicitName) {
    return {
      rawQuery: rawQuery || [explicitName, explicitCity, explicitCountry].filter(Boolean).join(", "),
      name: explicitName,
      city: explicitCity || null,
      country: explicitCountry || null,
    };
  }

  if (!rawQuery) {
    return null;
  }

  const parts = rawQuery
    .split(/[，,]/)
    .map((value) => normalizeValue(value))
    .filter(Boolean);

  return {
    rawQuery,
    name: parts[0] || rawQuery,
    city: parts[1] || null,
    country: parts.length > 2 ? parts.slice(2).join(" ") : null,
  };
}

function buildKeywordVariants(context: SearchContext) {
  const variants = new Set<string>();
  const name = normalizeValue(context.name);
  const city = normalizeValue(context.city);

  if (context.rawQuery) {
    variants.add(context.rawQuery);
  }

  if (name && city) {
    variants.add(`${name} ${city}`);
    variants.add(`${city}${name}`);
  }

  if (name) {
    variants.add(name);
  }

  return Array.from(variants).slice(0, 4);
}

function parseAmapLocation(location?: string) {
  if (!location) {
    return null;
  }

  const [lngText, latText] = location.split(",");
  const longitude = Number(lngText);
  const latitude = Number(latText);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function isInChina(latitude: number, longitude: number) {
  return (
    longitude > 73.66 &&
    longitude < 135.05 &&
    latitude > 3.86 &&
    latitude < 53.55
  );
}

function transformLatitude(x: number, y: number) {
  let result =
    -100 +
    2 * x +
    3 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));

  result +=
    ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) /
    3;
  result +=
    ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
  result +=
    ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) *
      2) /
    3;

  return result;
}

function transformLongitude(x: number, y: number) {
  let result =
    300 +
    x +
    2 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));

  result +=
    ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) /
    3;
  result +=
    ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
  result +=
    ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) *
      2) /
    3;

  return result;
}

function gcj02ToWgs84(latitude: number, longitude: number) {
  if (!isInChina(latitude, longitude)) {
    return { latitude, longitude };
  }

  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  const dLat = transformLatitude(longitude - 105.0, latitude - 35.0);
  const dLng = transformLongitude(longitude - 105.0, latitude - 35.0);
  const radLat = (latitude / 180.0) * Math.PI;
  let magic = Math.sin(radLat);

  magic = 1 - ee * magic * magic;

  const sqrtMagic = Math.sqrt(magic);
  const adjustedLat =
    latitude +
    (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  const adjustedLng =
    longitude + (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);

  return {
    latitude: latitude * 2 - adjustedLat,
    longitude: longitude * 2 - adjustedLng,
  };
}

function stringifyCity(city?: string | string[]) {
  if (Array.isArray(city)) {
    return city[0] || null;
  }

  return city || null;
}

function buildDisplayName(parts: Array<string | null | undefined>) {
  return parts.map((value) => normalizeValue(value)).filter(Boolean).join(", ");
}

function mapPlaceResult(place: AmapPlace, index: number) {
  const location = parseAmapLocation(place.location);
  if (!location) {
    return null;
  }

  const { latitude, longitude } = gcj02ToWgs84(
    location.latitude,
    location.longitude
  );
  const city = stringifyCity(place.cityname) || place.adname || null;
  const country = "中国";

  return {
    id: place.id || `amap-place-${index}`,
    name: place.name || "未命名地点",
    city,
    country,
    latitude,
    longitude,
    displayName:
      buildDisplayName([
        place.name,
        place.address,
        place.adname,
        stringifyCity(place.cityname),
        place.pname,
      ]) || place.name || "未命名地点",
  } satisfies GeocodeResult;
}

function mapGeocodeResult(item: AmapGeocode, index: number, fallbackName: string) {
  const location = parseAmapLocation(item.location);
  if (!location) {
    return null;
  }

  const { latitude, longitude } = gcj02ToWgs84(
    location.latitude,
    location.longitude
  );
  const city = stringifyCity(item.city) || item.district || item.province || null;

  return {
    id: `amap-geocode-${index}`,
    name: fallbackName,
    city,
    country: item.country || "中国",
    latitude,
    longitude,
    displayName:
      buildDisplayName([item.formatted_address, item.district, item.province]) ||
      fallbackName,
  } satisfies GeocodeResult;
}

function isTimeoutError(error: unknown) {
  if (error instanceof DOMException) {
    return error.name === "TimeoutError" || error.name === "AbortError";
  }

  return (
    error instanceof Error &&
    /timeout|aborted due to timeout/i.test(error.message)
  );
}

function buildAmapSignature(url: URL) {
  if (!AMAP_SECURITY_KEY) {
    return null;
  }

  const sortedPairs = Array.from(url.searchParams.entries())
    .filter(([key]) => key !== "sig")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("md5")
    .update(`${sortedPairs}${AMAP_SECURITY_KEY}`, "utf8")
    .digest("hex");
}

async function fetchAmapJson<T>(url: URL) {
  if (!AMAP_WEB_SERVICE_KEY) {
    throw new Error("未配置高德地图 Web 服务 Key，请在 .env 中设置 AMAP_WEB_SERVICE_KEY");
  }

  url.searchParams.set("key", AMAP_WEB_SERVICE_KEY);

  const sig = buildAmapSignature(url);
  if (sig) {
    url.searchParams.set("sig", sig);
  }

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(AMAP_TIMEOUT_MS),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error("高德定位服务响应超时，请稍后重试，或直接在地图上点选位置");
    }

    throw new Error("高德定位服务暂时不可用，请稍后重试");
  }

  if (!response.ok) {
    throw new Error("高德定位服务请求失败，请稍后重试");
  }

  return (await response.json()) as T;
}

async function searchAmapPlaces(context: SearchContext) {
  const results: GeocodeResult[] = [];
  const seenIds = new Set<string>();
  const city = normalizeValue(context.city);

  for (const keywords of buildKeywordVariants(context)) {
    const url = new URL("https://restapi.amap.com/v3/place/text");
    url.searchParams.set("keywords", keywords);
    url.searchParams.set("offset", "5");
    url.searchParams.set("page", "1");
    url.searchParams.set("extensions", "base");

    if (city) {
      url.searchParams.set("city", city);
      url.searchParams.set("citylimit", "true");
    }

    const data = await fetchAmapJson<AmapPlaceSearchResponse>(url);

    if (data.status !== "1") {
      throw new Error(data.info || "高德地点搜索失败");
    }

    for (const [index, place] of (data.pois || []).entries()) {
      const mapped = mapPlaceResult(place, index);
      if (!mapped || seenIds.has(mapped.id)) {
        continue;
      }

      seenIds.add(mapped.id);
      results.push(mapped);
    }

    if (results.length > 0) {
      return results;
    }
  }

  return results;
}

async function geocodeAmapAddress(context: SearchContext) {
  const url = new URL("https://restapi.amap.com/v3/geocode/geo");
  url.searchParams.set("address", context.rawQuery || context.name);

  if (context.city) {
    url.searchParams.set("city", context.city);
  }

  const data = await fetchAmapJson<AmapGeocodeResponse>(url);

  if (data.status !== "1") {
    throw new Error(data.info || "高德地理编码失败");
  }

  return (data.geocodes || [])
    .map((item, index) => mapGeocodeResult(item, index, context.name))
    .filter(Boolean) as GeocodeResult[];
}

export async function GET(request: NextRequest) {
  const context = parseSearchContext(request);

  if (!context) {
    return NextResponse.json({ error: "缺少搜索关键词" }, { status: 400 });
  }

  try {
    const placeResults = await searchAmapPlaces(context);
    if (placeResults.length > 0) {
      return NextResponse.json({ results: placeResults });
    }

    const geocodeResults = await geocodeAmapAddress(context);
    return NextResponse.json({ results: geocodeResults });
  } catch (error) {
    console.error("AMap geocode search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "地点搜索失败，请稍后再试" },
      { status: 500 }
    );
  }
}
