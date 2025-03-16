{ pkgs ? import <nixpkgs> {}, displayrUtils }:

pkgs.rPackages.buildRPackage {
  name = "rhtmlPalmTrees";
  version = displayrUtils.extractRVersion (builtins.readFile ./DESCRIPTION); 
  src = ./.;
  description = ''R package that combines bar charts and radial plots to generate a palm tree plot.'';
  propagatedBuildInputs = with pkgs.rPackages; [ 
    jsonlite
    htmlwidgets
  ];
}
