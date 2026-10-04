import type { IconSvgObject } from "@hugeicons/core-free-icons/types";
import type { Emotion } from "@/types";
import AnnoyedIcon from "@hugeicons/core-free-icons/AnnoyedIcon";
import ArmchairIcon from "@hugeicons/core-free-icons/ArmchairIcon";
import BadgeCheckIcon from "@hugeicons/core-free-icons/BadgeCheckIcon";
import BatteryIcon from "@hugeicons/core-free-icons/BatteryIcon";
import BatteryLowIcon from "@hugeicons/core-free-icons/BatteryLowIcon";
import BellRingIcon from "@hugeicons/core-free-icons/BellRingIcon";
import BombIcon from "@hugeicons/core-free-icons/BombIcon";
import BrickWallIcon from "@hugeicons/core-free-icons/BrickWallIcon";
import CactusIcon from "@hugeicons/core-free-icons/CactusIcon";
import CircleOffIcon from "@hugeicons/core-free-icons/CircleOffIcon";
import CircleQuestionMarkIcon from "@hugeicons/core-free-icons/CircleQuestionMarkIcon";
import CloudAlertIcon from "@hugeicons/core-free-icons/CloudAlertIcon";
import CloudFogIcon from "@hugeicons/core-free-icons/CloudFogIcon";
import CloudRainIcon from "@hugeicons/core-free-icons/CloudRainIcon";
import CrosshairIcon from "@hugeicons/core-free-icons/CrosshairIcon";
import DentalBrokenToothIcon from "@hugeicons/core-free-icons/DentalBrokenToothIcon";
import DropletIcon from "@hugeicons/core-free-icons/DropletIcon";
import EarIcon from "@hugeicons/core-free-icons/EarIcon";
import EyeOffIcon from "@hugeicons/core-free-icons/EyeOffIcon";
import FlameIcon from "@hugeicons/core-free-icons/FlameIcon";
import FlowerIcon from "@hugeicons/core-free-icons/FlowerIcon";
import FootprintsIcon from "@hugeicons/core-free-icons/FootprintsIcon";
import GaugeIcon from "@hugeicons/core-free-icons/GaugeIcon";
import GavelIcon from "@hugeicons/core-free-icons/GavelIcon";
import GemIcon from "@hugeicons/core-free-icons/GemIcon";
import GhostIcon from "@hugeicons/core-free-icons/GhostIcon";
import HandHeartIcon from "@hugeicons/core-free-icons/HandHeartIcon";
import HandPrayerIcon from "@hugeicons/core-free-icons/HandPrayerIcon";
import HandsClappingIcon from "@hugeicons/core-free-icons/HandsClappingIcon";
import HappyIcon from "@hugeicons/core-free-icons/HappyIcon";
import HeartHandshakeIcon from "@hugeicons/core-free-icons/HeartHandshakeIcon";
import HeartIcon from "@hugeicons/core-free-icons/HeartIcon";
import HeartPulseIcon from "@hugeicons/core-free-icons/HeartPulseIcon";
import HourglassIcon from "@hugeicons/core-free-icons/HourglassIcon";
import LifebuoyIcon from "@hugeicons/core-free-icons/LifebuoyIcon";
import LightbulbIcon from "@hugeicons/core-free-icons/LightbulbIcon";
import ListChecksIcon from "@hugeicons/core-free-icons/ListChecksIcon";
import MessageCircleQuestionMarkIcon from "@hugeicons/core-free-icons/MessageCircleQuestionMarkIcon";
import NeutralIcon from "@hugeicons/core-free-icons/NeutralIcon";
import PartyPopperIcon from "@hugeicons/core-free-icons/PartyPopperIcon";
import PersonStandingIcon from "@hugeicons/core-free-icons/PersonStandingIcon";
import Plant02Icon from "@hugeicons/core-free-icons/Plant02Icon";
import PuzzleIcon from "@hugeicons/core-free-icons/PuzzleIcon";
import Rocket01Icon from "@hugeicons/core-free-icons/Rocket01Icon";
import ScaleIcon from "@hugeicons/core-free-icons/ScaleIcon";
import ShieldHalfIcon from "@hugeicons/core-free-icons/ShieldHalfIcon";
import ShieldOffIcon from "@hugeicons/core-free-icons/ShieldOffIcon";
import ShieldQuestionMarkIcon from "@hugeicons/core-free-icons/ShieldQuestionMarkIcon";
import SleepingIcon from "@hugeicons/core-free-icons/SleepingIcon";
import SmileIcon from "@hugeicons/core-free-icons/SmileIcon";
import SnailIcon from "@hugeicons/core-free-icons/SnailIcon";
import Sun01Icon from "@hugeicons/core-free-icons/Sun01Icon";
import SunriseIcon from "@hugeicons/core-free-icons/SunriseIcon";
import SurpriseIcon from "@hugeicons/core-free-icons/SurpriseIcon";
import ThumbsDownIcon from "@hugeicons/core-free-icons/ThumbsDownIcon";
import TicketXIcon from "@hugeicons/core-free-icons/TicketXIcon";
import Timer01Icon from "@hugeicons/core-free-icons/Timer01Icon";
import Tornado01Icon from "@hugeicons/core-free-icons/Tornado01Icon";
import TrendingDownIcon from "@hugeicons/core-free-icons/TrendingDownIcon";
import TrophyIcon from "@hugeicons/core-free-icons/TrophyIcon";
import TsunamiIcon from "@hugeicons/core-free-icons/TsunamiIcon";
import UfoIcon from "@hugeicons/core-free-icons/UfoIcon";
import UserXIcon from "@hugeicons/core-free-icons/UserXIcon";
import UsersIcon from "@hugeicons/core-free-icons/UsersIcon";
import VenetianMaskIcon from "@hugeicons/core-free-icons/VenetianMaskIcon";
import VibrateIcon from "@hugeicons/core-free-icons/VibrateIcon";
import WavesIcon from "@hugeicons/core-free-icons/WavesIcon";
import WeightIcon from "@hugeicons/core-free-icons/WeightIcon";
import WindIcon from "@hugeicons/core-free-icons/WindIcon";
import WorkoutRunIcon from "@hugeicons/core-free-icons/WorkoutRunIcon";
import ZapIcon from "@hugeicons/core-free-icons/ZapIcon";

/** Icon per emotion key. Keys are open strings, so lookups may miss. */
export type EmotionIcons = Partial<Record<Emotion["key"], IconSvgObject>>;

/**
 * Icon for every enabled emotion, from Hugeicons free Stroke Rounded (MIT).
 *
 * Import each icon by its own path: the package index holds 6,000+ icons and
 * Metro bundles all of them. Emotions without an icon keep the category dot.
 */
export const EMOTION_ICONS: EmotionIcons = {
  energized: ZapIcon,
  enthusiastic: Rocket01Icon,
  excited: PartyPopperIcon,
  focused: CrosshairIcon,
  happy: Sun01Icon,
  hopeful: Plant02Icon,
  inspired: LightbulbIcon,
  optimistic: SunriseIcon,
  productive: ListChecksIcon,
  proud: TrophyIcon,
  surprised: SurpriseIcon,
  angry: BombIcon,
  annoyed: AnnoyedIcon,
  anxious: Tornado01Icon,
  concerned: MessageCircleQuestionMarkIcon,
  confused: CircleQuestionMarkIcon,
  embarrassed: VenetianMaskIcon,
  fomo: TicketXIcon,
  frustrated: BrickWallIcon,
  hyper: GaugeIcon,
  impassioned: FlameIcon,
  irritated: CactusIcon,
  nervous: VibrateIcon,
  overwhelmed: TsunamiIcon,
  pressured: WeightIcon,
  restless: FootprintsIcon,
  stressed: HeartPulseIcon,
  uneasy: CloudFogIcon,
  worried: CloudAlertIcon,
  accepted: BadgeCheckIcon,
  appreciated: HandsClappingIcon,
  balanced: ScaleIcon,
  calm: WavesIcon,
  comfortable: ArmchairIcon,
  compassionate: HandHeartIcon,
  connected: UsersIcon,
  content: PersonStandingIcon,
  fragile: DentalBrokenToothIcon,
  good: SmileIcon,
  grateful: HandPrayerIcon,
  heard: EarIcon,
  loved: HeartIcon,
  relieved: WindIcon,
  satisfied: HappyIcon,
  supported: LifebuoyIcon,
  thankful: HeartHandshakeIcon,
  alienated: UfoIcon,
  ashamed: EyeOffIcon,
  bored: HourglassIcon,
  depressed: CloudRainIcon,
  disappointed: ThumbsDownIcon,
  exhausted: BatteryIcon,
  hopeless: CircleOffIcon,
  insecure: ShieldQuestionMarkIcon,
  lonely: PersonStandingIcon,
  meh: NeutralIcon,
  pessimistic: TrendingDownIcon,
  sad: DropletIcon,
  tired: SleepingIcon,
  vulnerable: ShieldOffIcon,
  fearful: GhostIcon,
  grieved: FlowerIcon,
  rejected: UserXIcon,
  unmotivated: SnailIcon,
  weak: BatteryLowIcon,
  awkward: PuzzleIcon,
  distracted: BellRingIcon,
  desire: GemIcon,
  impatient: Timer01Icon,
  brave: ShieldHalfIcon,
  guilty: GavelIcon,
  motivated: WorkoutRunIcon,
};
