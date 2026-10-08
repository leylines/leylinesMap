import { computed } from "mobx";
import CatalogFunction from "terriajs/lib/Models/Catalog/CatalogFunction";
import CommonStrata from "terriajs/lib/Models/Definition/CommonStrata";
import DoubleParameter from "terriajs/lib/Models/FunctionParameters/DoubleParameter";
import EnumerationParameter from "terriajs/lib/Models/FunctionParameters/EnumerationParameter";
import CzmlCatalogItem from "terriajs/lib/Models/Catalog/CatalogItems/CzmlCatalogItem";

export default class UvgGridFunction extends CatalogFunction {
  static readonly type = "uvg-grid-generator";

  get type() {
    return UvgGridFunction.type;
  }
  get name() {
    return "Becker-Hagens Grid Generator";
  }

  // 1. Die Parameter definieren (Eingabefelder im UI)
  @computed
  get parameters() {
    return [
      new DoubleParameter(this, {
        id: "lat",
        name: "Latitude",
        description: "Zentrum Breitengrad",
        defaultValue: 31.72
      }),
      new DoubleParameter(this, {
        id: "lon",
        name: "Longitude",
        description: "Zentrum Längengrad",
        defaultValue: 31.2
      }),
      new DoubleParameter(this, {
        id: "bearing",
        name: "Bearing (Rotation)",
        description: "Ausrichtung in Grad",
        defaultValue: 0.0
      }),
      // Schritt 2: DB Auswahl
      new EnumerationParameter(this, {
        id: "db_table",
        name: "Datenbank Quelle",
        options: [
          { id: "megalithic" },
          { id: "sacredsites" },
          { id: "interfaithmary" }
        ],
        defaultValue: "megalithic"
      })
    ];
  }

  // 2. Die Ausführung (Was passiert beim Klick auf "Run"?)
  protected async invokeInternal(
    _stratumId: string,
    parameters: any
  ): Promise<CzmlCatalogItem[]> {
    const { lat, lon, bearing, db_table } = parameters;
    const results: CzmlCatalogItem[] = [];

    // Erstelle den "Basic" Layer
    const basicItem = new CzmlCatalogItem(
      `uvg-basic-${lat}-${lon}`,
      this.terria
    );
    basicItem.setTrait(CommonStrata.user, "name", "Becker-Hagens UVG - Basic");
    basicItem.setTrait(
      CommonStrata.user,
      "url",
      `api/createGrid/${lat}/${lon}/${bearing}/diamond/beckerhagens/basic/lines?table=${db_table}`
    );

    // Erstelle den "Tetrahedrons" Layer
    const tetraItem = new CzmlCatalogItem(
      `uvg-tetra-${lat}-${lon}`,
      this.terria
    );
    tetraItem.setTrait(
      CommonStrata.user,
      "name",
      "Becker-Hagens UVG - Tetrahedrons"
    );
    tetraItem.setTrait(
      CommonStrata.user,
      "url",
      `api/createGrid/${lat}/${lon}/${bearing}/diamond/beckerhagens/tetrahedrons/lines?table=${db_table}`
    );

    results.push(basicItem, tetraItem);
    return results;
  }
}
