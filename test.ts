import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Col,
  Dropdown,
  Form,
  Pagination,
  Row,
  Table,
} from "react-bootstrap";
import Swal from "sweetalert2";
// import BgLoadingDot from "@/components/BgLoadingDot";
import LoadingDot from "@/components/BgLoadingDot";
import { ICameraExtends } from "../CameraViewContent";
import { getStatusCamera } from "@/utils/helper/misc";
import { useQuery } from "@apollo/client";
import { GET_PROJECTS } from "@/apollo/models/project";
import { IProject, IProjectLayout } from "@/intefaces/project-interface";
import { IDatastreamData } from "@/intefaces/datastream-interface";
import dayjs from "dayjs";
import axios from "axios";
const column_data = [
  {
    name: "Camera ID",
    className: "justify-content-center",
    sort: true,     //เปิด - ปิด sort icon
    sort_key: "@iot.id",  //key object ที่จะ sort
  },
  {
    name: "Camera name",
    className: "justify-content-center",
    sort: true,
    sort_key: "name",
  },
  {
    name: "District",
    className: "justify-content-center",
    sort: true,
    sort_key: "properties.district",
  },
  {
    name: "Project",
    className: "justify-content-center",
    sort: true,
    sort_key: `onlyProjectNameFirst`,
  },
  {
    name: "IP Address",
    className: "justify-content-center",
    sort: true,
    sort_key: `properties.nvr_ip`,
  },
  {
    name: "Pole",
    className: "justify-content-center",
    sort: true,
    sort_key: "pole",
  },
  {
    name: "Last Connect",
    className: "justify-content-center",
    sort: false,
    sort_key: "name",
  },
  {
    name: "Camera status",
    className: "justify-content-center",
    sort: true,
    sort_key: "Datastreams.Observations.result",
  },
];

export const SHOW_LIST = [
  {
    amount: 25,
  },
  {
    amount: 50,
  },
  {
    amount: 100,
  },
];

interface IFilterCameraList {
  name: string | null;
  preview_name: string | null;
  show_amount: number;
}
const MAXIMUM_ITEM = 30;

const CameraOverviewTable = (props: any) => {
  const [filterData, setFilterData] = useState<IFilterCameraList>({
    name: null,
    preview_name: null,
    show_amount: 25,
  });
  // console.log("%c FILTER DATA ", "color: crimson;", filterData);

  const [currentPage, setCurrentPage] = useState(0); // กำหมดค่าเริ่มต้น หน้าปัจจุบัน
  const projectState = useQuery(GET_PROJECTS);
  // console.log("🚀 ~ file: TableCameraOverview.tsx:79 ~ CameraOverviewTable ~ projectState:", projectState)
  const onClickNext = () => {
    if( currentPage + 1 < totalPage){
    setCurrentPage(prev => prev + 1);
    }
  };

  const onClickPrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | '' }>({
    key: '',
    direction: '',
  });

  const typeList = ["Camera Name", "District", "IP"]
  const [typeName, setTypeName] = useState("Camera name");

  const [filterNameText, setFilterNameText] = useState<any>(null); // กำหมดค่าเริ่มต้น ค้นหาด้วยชื่อ
  const [totalPage, setTotalPage] = useState(0);
  const [countIot, setCountIot] = useState(0);

  const onChangeInput  = (value: string) => {
    setCurrentPage(0);

    setFilterNameText(value);
  };

  useEffect(() => {
    if(filterNameText === "" && initialLoad.current === false){
      fetchAndFilter();
      // console.log('filterNameText:', filterNameText);
    }

  }, [filterNameText]);


  type ParseObject = {
    [key: string]: string | number | boolean | ParseObject | null;
  };
  
  const urlParse = (obj: ParseObject, prefix?: string): string => {
    let str: string[] = [];
  
    for (const p in obj) {
      if (obj.hasOwnProperty(p)) {
        const k: string = prefix ? `${prefix}[${p}]` : p;
        const v: string | number | boolean | ParseObject | null = obj[p];
        str.push((v !== null && typeof v === "object") ?
            urlParse(v, k) :
            `${k}=${String(v)}`);
      }
    }
    return str.join("&");
  };
  
  
  const fetchAndFilter = async () => {
    setPageLoading(true);
    let newdata: any = cameraList;
    const lowerCaseFilter = filterNameText ? filterNameText.toLowerCase() : "";
    const itemsToSkip = currentPage * filterData.show_amount;
    let itemsToFetch = filterData.show_amount; 
    let orderby = null;
    let obj : any= {
      top: itemsToFetch,
      skip: itemsToSkip,
      expand: "Datastreams/Thing"
    }
    if(sortConfig.key !== '' && sortConfig.direction !== ''){
      orderby = `${sortConfig.key} ${sortConfig.direction}`
      obj["orderby"] = orderby
    }
    if(lowerCaseFilter.length > 0){
      if(typeName === "Camera Name"){
        obj["name"] = lowerCaseFilter + '*'
        console.log('%cTableCameraOverview.tsx line:181 obj', 'color: #007acc;', obj);
      }else if(typeName === "District"){
        obj["district"] = lowerCaseFilter + '*'
        console.log('%cTableCameraOverview.tsx line:181 obj', 'color: #007acc;', obj);
      }else if(typeName === "IP"){
        obj["ip"] = lowerCaseFilter + '*'
        console.log('%cTableCameraOverview.tsx line:181 obj', 'color: #007acc;', obj);
      }
    }
        try {
          let query : string = urlParse(obj)
          query = query.length > 0 ? `?${query}` : ""
          // console.log('%cTableCameraOverview.tsx line:156 obj', 'color: #007acc;', urlParse(obj));
            const response = await fetch(`/api/vallaris/get-sensor${query}`);
            if (!response.ok) throw new Error('Failed to fetch from the API');
            const result = await response.json();
            const cameraOnsearch = result.data.value;
            // console.log('%cTableCameraOverview.tsx line:137 cameraOnsearch', 'color: #007acc;', cameraOnsearch);
            const finalResult: ICameraExtends[] = [...cameraOnsearch].map((item: ICameraExtends, index) => {
              return {
                ...item,
                cameraStatus: getStatusCamera(item),
              };
            });

            setCameraList(prevCameraList => {
              const uniqueCameras = finalResult.filter(newCamera => 
                !prevCameraList.some(prevCamera => prevCamera["@iot.id"] === newCamera["@iot.id"])
              );
            
              return [...prevCameraList, ...uniqueCameras];
            });

            setCameraListPage((prevCameraListPage: any[]) => {
              // Get the previous list of cameras for the current page
              const previousCamerasForPage = (prevCameraListPage[filterData.show_amount] && prevCameraListPage[filterData.show_amount][currentPage]) || [];

              return {
                  [filterData.show_amount]: {
                      [currentPage]: finalResult
                  }
              };
            });
            setCountIot(result.iot_count);
            const pages = Math.ceil(countIot / filterData.show_amount);
            setTotalPage(pages);

            setPageLoading(false);

        } catch (error) {
            console.error('Error fetching data:', error);
            Swal.fire("", "Fectching data error.", "error");
            setPageLoading(false);

            return;  // Exit if there's an error
        }
        setPageLoading(false);

    const toSet = newdata.filter((_: any, index: number) => {
      return index >= START_ITEM_COUNTER && index < END_ITEM_COUNTER;
    });
    
    setCameraToShow((prev) => [...toSet]);

    const pages = Math.ceil(newdata.length / filterData.show_amount);
    setTotalPage(pages);
  };

  // =====================================

  const [cameraList, setCameraList] = useState<any[]>([]);
  const [cameraListOnSearch, setCameraListOnSearch] = useState<any[]>([]);
  const [cameraToShow, setCameraToShow] = useState<any[]>([]);
  const [cameraToShowOnSearch, setCameraToShowOnSearch] = useState<any[]>([]);
  const [cameraListPage, setCameraListPage] = useState<any>({});


  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const START_ITEM_COUNTER = currentPage * filterData.show_amount;
  const END_ITEM_COUNTER_TEMP = (currentPage + 1) * filterData.show_amount;
  const END_ITEM_COUNTER = END_ITEM_COUNTER_TEMP > countIot ? countIot : END_ITEM_COUNTER_TEMP;

  
  // const totalPage = Math.ceil(cameraList.length / filterData.show_amount);

  // =====================================
  useEffect(() => {
    setCountIot(cameraListPage.iot_count)
    // console.log('Updated cameraList:', cameraListPage);

  }, [countIot]);

  useEffect(() => {
    if(sortConfig.key !== ""){
      fetchAndFilter();
    }
    // console.log('Updated sortConfig:', sortConfig);
  }, [sortConfig]);

  const handleSearch = () => {
    fetchAndFilter();
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      fetchAndFilter();
    }
  };

  interface CameraStatus {
    [iotId: string]: {
      result: number;
      phenomenonTime?: string; // or other properties
    };
  }
  
  const [cameraStatusData, setCameraStatusData] = useState<CameraStatus>({});
  const [isLoading, setIsLoading] = useState(false);

  const CameraRow = ({ cameraSensorStatusIotId }: any) => {
    const [status, setStatus] = useState('Loading...');
    const currentPageRef = useRef(currentPage); // Initialize status as 'Loading...'
  
    useEffect(() => {
      currentPageRef.current = currentPage;
    }, [currentPage]);
  
    useEffect(() => {
      const fetchData = async () => {
        try {
          const statusData = await fetchDatastreamObservations(cameraSensorStatusIotId);
          if (currentPageRef.current === currentPage) {
            setStatus(statusData?.result === 1 ? 'Online' : 'Offline');
          }
        } catch (error) {
          console.error(error);
          setStatus('No sensor data found.');
        }
      };
      
      fetchData();
      
    }, [currentPage]); // Re-fetch data when `cameraSensorStatusIotId` changes
  
    return (
        <div
            className="d-flex align-items-center justify-content-center"
          >
            <p className="mb-0 fw-light me-2 text-center">
              {status}
            </p>
            <>
              {status === "Loading..." ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              ) : (
                <>
                <i
                  className={`fz-15 fas fa-circle camera-status-${status === "Online" ? "online" : "offline"
                    }`}
                ></i>
                </>
              )}
            </>
          </div>
    );
  };
  

  const sortableColumns = ['Camera ID','Camera name','District', 'IP Address', 'Pole', 'Camera status'];

  const handleSortToggle = (key: string) => {
    let direction: 'asc' | 'desc' | '';
    // If the same column is clicked, toggle the direction
    if (sortConfig.key === key) {
      if(sortConfig.direction === ''){
        direction = 'asc'
      }else if(sortConfig.direction === 'asc'){
        direction = 'desc'
      }else{
        direction = ''
      }
      setSortConfig({
        key,
        direction: direction,
      });

    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  async function fetchDatastreamObservations(datastreamsIotId: string) {
    if (!pageLoading) {
      const source = axios.CancelToken.source();

      try {
        // Axios GET request
        const response = await axios.get(
          `/api/vallaris/get-camera-status`,
          {
            params: { datastreams_iot_id: datastreamsIotId },
            cancelToken: source.token,
          }
        );

        // Checking the response status
        if (response.status !== 200) {
          throw new Error('Network response was not ok');
        }

        const jsonResponse = response.data;

        // Ensure that there is at least one observation in the response.
        if (jsonResponse.value && jsonResponse.value.length > 0) {
          // Get the most recent observation (assuming the first item is the most recent).
          const mostRecentObservation = jsonResponse.value[0];

          // Extract and return the 'phenomenonTime' and 'result' from the most recent observation.
          const { phenomenonTime, result } = mostRecentObservation;
          return { phenomenonTime, result };
        } else {
          throw new Error('No status sensor found');
        }
      } catch (error: any) {
        console.error('Fetch error: ', error.message);
        throw error;
      }
    }
  }

  // =====================================

  const initialLoad = useRef(true);
  

  useEffect(() => {
    const toSet = cameraList.filter((_: string, index: number) => {
      return index >= START_ITEM_COUNTER && index < END_ITEM_COUNTER;
    });
    
    setCameraToShow((prev) => [...toSet]);
    const pages = Math.ceil(countIot / filterData.show_amount);
    setTotalPage(pages);
  }, [cameraList, filterData.show_amount]);

  useEffect(() => {
    if (initialLoad.current === true) {
      fetchAndFilter();
      initialLoad.current = false;
      return;
    }
    if (cameraListPage?.[filterData?.show_amount]?.[currentPage]) {
        return;
    }
    if (filterNameText !== "" && filterNameText !== null || currentPage > 0 || currentPage === 0){
      fetchAndFilter();
        // console.log('%cTableCameraOverview.tsx line:579 ', 'color: #007acc;', );
    }
    
  }, [currentPage, filterData.show_amount]);

  return (
    <>
      <LoadingDot status={pageLoading} />
      <div className="camera-overview-layout-content mt-auto">
        <Row>
          <Col
            xs={12}
            className="d-flex align-items-end justify-content-between mb-4"
          >
            <Dropdown className="custom-dropdown">
              <Dropdown.Toggle variant="transparent" id="dropdown-basic">
                <div className="d-flex justify-content-between align-items-center">
                  Show {filterData.show_amount} list
                  <span className="icon-to-Down"></span>
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu>
                {SHOW_LIST.map((item: any, key: number) => {
                  return (
                    <Dropdown.Item
                      onClick={() => {
                        setCurrentPage(0);
                        setFilterData((prev) => ({
                          ...prev,
                          show_amount: item.amount,
                        }));
                      }}
                      key={key}
                    >
                      Show {item.amount ?? 0} list
                    </Dropdown.Item>
                  );
                })}
              </Dropdown.Menu>
            </Dropdown>
            <div className="d-flex align-items-end">
              <Dropdown style={{minWidth:"160px"}}>
                <Dropdown.Toggle
                  variant=""
                  className="w-100 filter-on-table"
                  id="dropdown-basic"
                >
                  <div className="w-100 d-flex justify-content-between align-items-center">
                    <i className="text-white">
                      {typeName}
                    </i>
                    <i className="fal fa-chevron-down text-white"></i>
                  </div>
                </Dropdown.Toggle>
                <div className="dropdown-menu-box">
                  <Dropdown.Menu>
                    {typeList.map((_type, index) => (
                      <Dropdown.Item
                        onClick={() => {
                          setTypeName(_type);
                        }}
                        key={index}
                      >
                        {_type}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </div>
              </Dropdown>
              <div className="d-block">
                {" "}
                <Form.Control
                  className="inputSearch rounded-0 shadow-none"
                  type="text"
                  id="inputSearch"
                  aria-describedby="passwordHelpBlock"
                  placeholder={`Search by ${typeName
                    }...`}
                  onChange={(e) => onChangeInput(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                />
              </div>
              <Button variant="primary mx-3" onClick={handleSearch}>
                <p className="mb-0 camera-overview-text-btn">Search</p>
              </Button>
              {/* <button id="id" data-dir="asc" onClick={(e) => onSortData(e)}>sort id</button> */}
              {/* <Link href={"/cameramanagement/createCamera"}>
                <Button variant="primary">
                  <p className="mb-0 camera-overview-text-btn">
                    + Add New Camera
                  </p>
                </Button>
              </Link> */}
            </div>
          </Col>
          <Col xs={12}>
            <div className="scroll-table">
              <Table responsive="sm" striped hover variant="dark">
                <thead>
                  <tr>
                  {column_data.map((col: any, key: number) => (
                    <th key={key} className={col.className} style={{ textAlign: 'center' }}>
                      {col.name}
                      {sortableColumns.includes(col.name) &&
                        <span
                          style={{ cursor: 'pointer', fontSize: '0.7em' }}
                          onClick={() => handleSortToggle(col.sort_key)}
                        >
                          <span className={`ms-1 sort-box ${sortConfig.key === col.name && sortConfig.direction !== '' ? "active" : ""}`}>
                            {sortConfig.key === col.sort_key ? (
                              <>
                                {sortConfig.direction === 'asc' &&
                                  <>
                                    <i className="fas fa-long-arrow-alt-up" style={{ color: '#2a3fd3' }}></i>
                                    <i className="fas fa-long-arrow-alt-down"></i>
                                  </>
                                }
                                {sortConfig.direction === 'desc' && 
                                  <>
                                    <i className="fas fa-long-arrow-alt-up" ></i>
                                    <i className="fas fa-long-arrow-alt-down" style={{ color: '#2a3fd3' }}></i>
                                  </>
                                }
                                {sortConfig.direction === '' && 
                                  <>
                                    <i className="fas fa-long-arrow-alt-up" ></i>
                                    <i className="fas fa-long-arrow-alt-down"></i>
                                  </>
                                }
                              </>
                            ) : (
                              <>
                                <i className="fas fa-long-arrow-alt-up"></i>
                                <i className="fas fa-long-arrow-alt-down"></i>
                              </>
                            )}
                          </span>
                        </span>
                      }
                    </th>
                  ))}
                  </tr>
                </thead>
                <tbody>
                {projectState.loading == false && 
                cameraListPage?.[filterData?.show_amount]?.[currentPage]?.length > 0
                && cameraListPage[filterData.show_amount][currentPage].map((item: any, index: number) => {
                    const dataStreams = item["Datastreams"];
                    let poleName = "-";
                    if (dataStreams && dataStreams.length >= 1) {
                      const thing = dataStreams[0].Thing?.name;
                      poleName = thing ?? "-";
                    }
                    const projectList = (projectState?.data?.projects ?? []).filter((projectData: IProject) => {
                      return (projectData.project_layouts ?? []).find((projectLayout: IProjectLayout) => (projectLayout.layout_camera ?? []).find(cam => cam.iot_id == item["@iot.id"]));
                    });

                    const targetStream: IDatastreamData | undefined = dataStreams.find((item: IDatastreamData) => {
                      if (item.name && item.name.includes(":Camera-Status")) {
                          
                          if (item.Observations && item.Observations.length > 0) {
                              const lastObservation = item.Observations[item.Observations.length - 1];
                              return lastObservation.result === 0 || lastObservation.result === 1;
                          }
                      }
                      
                      return false;
                    });
                  
                    const latestPhenomenonTime = item.Datastreams[0]?.latestPhenomenonTime
                        ? dayjs(item.Datastreams[0]?.latestPhenomenonTime).format("DD/M/YYYY HH:mm") 
                        : "-";

                    const cameraSensorStatusDatastream = item.Datastreams.find(
                      (datastream: any) => datastream.name.includes("Camera-Status")
                    );
                    
                    const cameraSensorStatusIotId = cameraSensorStatusDatastream ? cameraSensorStatusDatastream["@iot.id"] : null;
                    
                    const onlyProjectName = projectList.map((item: IProject) => item.name);
                    // const currentLiveStream: IDatastreamData | undefined = dataStreams.find((item: IDatastreamData) => item.unitOfMeasurement.name == "Live");
                    // const lastestPhenomenonTime = currentLiveStream?.latestPhenomenonTime ? dayjs(currentLiveStream?.latestPhenomenonTime).format("DD/M/YYYY HH:mm") : "-";
                    return (
                      <tr key={index} className="text-center">
                        <td className="text-center">
                          <p
                            className="mb-0 fw-light"
                            style={{ width: "100%", minWidth: "300px" }}
                          >
                            {item["@iot.id"]}
                          </p>
                        </td>
                        <td className="text-center">
                          <p className="mb-0 fw-light">
                            {item?.name ?? "-"}
                          </p>
                        </td>
                        <td className="text-center">
                          <p className="mb-0 fw-light">
                            {item?.properties?.district ?? "-"}
                          </p>
                        </td>
                        <td className="text-center">
                          <p className="mb-0 fw-light text-center overflow-hidden user-select-none">
                            {onlyProjectName.length >= 1 ? onlyProjectName[0] : "-"}
                          </p>
                        </td>
                        <td className="text-center">
                          <p
                            className="mb-0 fw-light"
                            style={{ width: "100%", minWidth: "150px" }}
                          >
                            {item["properties"]?.nvr_ip ?? "-"}
                          </p>
                        </td>
                        <td className="text-center">
                          <p className="mb-0 fw-light text-nowrap">
                            {poleName}
                          </p>
                        </td>
                        <td className="text-center">
                          <p className="mb-0 fw-light text-nowrap">
                            {latestPhenomenonTime}
                          </p>
                        </td>
                        <td className="text-center">
                          {cameraSensorStatusIotId ? (
                            <CameraRow cameraSensorStatusIotId={cameraSensorStatusIotId} />
                          ) : (
                            <>
                              <p className="mb-0 fw-light text-nowrap">
                                No status sensor found.
                              </p>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {cameraListPage && cameraListPage?.[filterData?.show_amount]?.[currentPage]?.length === 0 && (
                      <tr className="text-center">
                          <td colSpan={8}>
                              <i>
                                  <h5>No data</h5>
                              </i>
                          </td>
                      </tr>
                  )}
                </tbody>
              </Table>
            </div>
            <div className="d-flex justify-content-between px-3">
              <div className="page-showing">
                <p className="mb-0">
                  Showing {START_ITEM_COUNTER} to {END_ITEM_COUNTER} of{" "}
                  {countIot} entries
                </p>
              </div>
              <Pagination>
                <Pagination.Prev onClick={() => onClickPrev()}>
                  Previous
                </Pagination.Prev>
                {Array.from({ length: totalPage }, (_, index) => index).map(
                  (page: any, i: number) => (
                    <Pagination.Item
                      active={currentPage === page}
                      onClick={() => setCurrentPage(page)}
                      key={i}
                    >
                      {page + 1}
                    </Pagination.Item>
                  )
                )}
                <Pagination.Next onClick={() => onClickNext()}>
                  Next
                </Pagination.Next>
              </Pagination>
            </div>
          </Col>
        </Row>
      </div>
    </>
  );
}

export default CameraOverviewTable;
