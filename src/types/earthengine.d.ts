declare module '@google/earthengine' {
  export function data(key: string, value?: any): any;
  export function initialize(
    opt_baseurl?: string | null,
    opt_tileurl?: string | null,
    opt_callback?: Function | null,
  ): void;
  export namespace data {
    function authenticateViaPrivateKey(
      privateKeyJson: any,
      opt_onSuccess?: Function | null,
      opt_onError?: Function | null,
    ): void;
    function getMapId(
      mapId: {
        image: any;
        visualization: Record<string, any>;
      },
      callback: (result: { mapid: string; token: string; error?: string }) => void,
    ): void;
  }
  export namespace Geometry {
    function Polygon(coords: number[][][], geom?: any, evenOdd?: boolean): any;
  }
  export namespace ImageCollection {
    function filterBounds(geometry: any): any;
    function filterDate(start: string, end: string): any;
    function filter(filter: any): any;
    function select(band: string | string[]): any;
    function sort(property: string, ascending?: boolean): any;
    function first(): any;
    function median(): any;
    function size(): any;
  }
  export namespace Image {
    function subtract(image: any): any;
    function abs(): any;
    function reduceRegion(options: { reducer: any; geometry: any; scale: number }): any;
  }
  export namespace Reducer {
    function mean(): any;
  }
  export namespace Filter {
    function eq(property: string, value: any): any;
  }
}
