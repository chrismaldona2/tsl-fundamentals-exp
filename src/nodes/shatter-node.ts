import {
  color,
  convertToTexture,
  float,
  int,
  max,
  mix,
  mx_noise_float,
  sqrt,
  texture,
  TWO_PI,
  vec2,
  viewportCoordinate,
  viewportSize,
  viewportUV,
} from "three/tsl";
import { Node, TempNode } from "three/webgpu";
import { voronoi } from "./voronoi";

class ShatterNode extends TempNode<"vec4"> {
  static get type() {
    return "ShatterNode";
  }

  private readonly textureNode: Node<"vec4">;
  private readonly progress: Node<"float">;
  private readonly crackColor: Node<"color">;
  private readonly crackColorStrength: Node<"float">;
  private readonly subdivision: Node<"float">;
  private readonly seed: Node<"int">;
  private readonly thickness: Node<"float">;
  private readonly offsetStrength: Node<"float">;

  constructor(
    textureNode: Node<"vec4">,
    progress: Node<"float">,
    crackColor: Node<"color">,
    crackColorStrength: Node<"float">,
    subdivision: Node<"float">,
    seed: Node<"int">,
    thickness: Node<"float">,
    offsetStrength: Node<"float">,
  ) {
    super("vec4");
    this.textureNode = textureNode;
    this.progress = progress;
    this.crackColor = crackColor;
    this.crackColorStrength = crackColorStrength;
    this.subdivision = subdivision;
    this.seed = seed;
    this.thickness = thickness;
    this.offsetStrength = offsetStrength;
  }

  setup() {
    // Voronoi
    const viewportMaxSize = max(viewportSize.x, viewportSize.y);
    const voronoiUv = viewportCoordinate.div(viewportMaxSize);
    const voronoiColor = voronoi(voronoiUv, this.subdivision, this.seed);

    // Cracks
    const cracksNoise = mx_noise_float(voronoiUv.mul(5)).remap(-1, 1, 0, 0.5);
    const cracksColor = this.crackColor.mul(this.crackColorStrength);
    const cracks = voronoiColor.g.step(
      this.progress.sub(cracksNoise).mul(this.thickness),
    );

    // Offset
    const goldenRatio = sqrt(5).add(1).div(2);
    const goldenAngle = goldenRatio.mul(TWO_PI);
    const angle = voronoiColor.a.mul(goldenAngle);
    const offset = vec2(angle.cos(), angle.sin()).mul(this.progress);
    const offsetUv = viewportUV.add(offset.mul(this.offsetStrength));

    return mix(
      cracksColor,
      texture(convertToTexture(this.textureNode), offsetUv),
      cracks,
    );
  }
}

export const shatter = (
  textureNode: Node<"vec4">,
  progress: Node<"float"> = float(1),
  crackColor: Node<"color"> = color(0xff824d),
  crackColorStrength: Node<"float"> = float(3),
  subdivision: Node<"float"> = float(4),
  seed: Node<"int"> = int(18),
  thickness: Node<"float"> = float(0.02),
  offsetStrength: Node<"float"> = float(0.02),
) =>
  new ShatterNode(
    textureNode,
    progress,
    crackColor,
    crackColorStrength,
    subdivision,
    seed,
    thickness,
    offsetStrength,
  );
